import { Router } from 'express';
import type { ActivityItem, AdminDashboard, AdminMeta, InServiceItem, NotificationSummary } from '../../../../shared/contracts.ts';
import { config } from '../../config.ts';
import { many, nowIso, one, run } from '../../db/index.ts';
import { addDays, dateKey, dayBounds, minutesBetween, todayBounds } from '../../lib/dates.ts';
import { notFound } from '../../lib/http.ts';
import { smtpConfigured } from '../../lib/mailer.ts';
import type { AttendanceDbRow } from '../../services/attendance.ts';
import { listNotifications, notificationScope } from '../../services/notifications.ts';
import { listStudents, studentScope } from '../../services/students.ts';

/** Panel, notificaciones y catálogos del portal administrativo */
export const systemRouter = Router();

systemRouter.get('/dashboard', (req, res) => {
  const admin = req.admin!;
  const scope = studentScope(admin);
  const students = listStudents(admin);
  const activeStudents = students.filter(s => s.active);
  const today = todayBounds();
  const now = new Date();
  const since = dayBounds(dateKey(addDays(now, -13))).start;

  const rows = many<AttendanceDbRow & { student_name: string; student_code: string; program: string }>(
    `SELECT a.*, s.full_name AS student_name, s.code AS student_code, s.program
       FROM attendance a JOIN students s ON s.id = a.student_id
      WHERE ${scope.sql} AND (a.check_in >= ? OR a.check_out IS NULL)
      ORDER BY a.check_in DESC`,
    ...scope.params,
    since,
  );

  const endTimes = new Map(
    many<{ student_id: string; end_time: string }>('SELECT student_id, end_time FROM schedules WHERE weekday = ?', now.getDay()).map(row => [
      row.student_id,
      row.end_time,
    ]),
  );

  const daily = new Map<string, number>();
  for (let offset = 13; offset >= 0; offset--) daily.set(dateKey(addDays(now, -offset)), 0);

  let minutesToday = 0;
  let lateToday = 0;
  let missingCheckouts = 0;
  const inService: InServiceItem[] = [];
  const activity: ActivityItem[] = [];

  for (const row of rows) {
    const isToday = row.check_in >= today.start;
    if (!row.check_out && !isToday) missingCheckouts++;
    if (row.status !== 'valid') continue;

    const key = dateKey(new Date(row.check_in));
    const minutes = row.check_out ? minutesBetween(row.check_in, row.check_out) : 0;
    if (row.check_out && daily.has(key)) daily.set(key, daily.get(key)! + minutes);
    if (!isToday) continue;

    minutesToday += row.check_out ? minutes : minutesBetween(row.check_in, now);
    if (row.late_minutes > 0) lateToday++;
    activity.push({ id: `${row.id}:in`, type: 'in', at: row.check_in, studentId: row.student_id, studentName: row.student_name });
    if (row.check_out) {
      activity.push({ id: `${row.id}:out`, type: 'out', at: row.check_out, studentId: row.student_id, studentName: row.student_name });
    } else {
      inService.push({
        recordId: row.id,
        studentId: row.student_id,
        studentName: row.student_name,
        studentCode: row.student_code,
        program: row.program,
        checkIn: row.check_in,
        scheduledEnd: endTimes.get(row.student_id) ?? null,
        lateMinutes: row.late_minutes,
      });
    }
  }
  activity.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  const pendingResets =
    one<{ count: number }>(
      `SELECT COUNT(*) AS count FROM password_reset_requests r JOIN students s ON s.id = r.student_id
        WHERE r.status = 'pending' AND ${scope.sql}`,
      ...scope.params,
    )?.count ?? 0;

  const dashboard: AdminDashboard = {
    activeStudents: activeStudents.length,
    completedStudents: activeStudents.filter(s => s.completedAt).length,
    minutesToday,
    validMinutesTotal: students.reduce((total, s) => total + s.validMinutes, 0),
    missingCheckouts,
    pendingResets,
    lateToday,
    inService,
    activity: activity.slice(0, 40),
    dailyMinutes: [...daily].map(([date, minutes]) => ({ date, minutes })),
    progress: activeStudents
      .map(s => ({ studentId: s.id, studentName: s.fullName, studentCode: s.code, validMinutes: s.validMinutes, requiredHours: s.requiredHours }))
      .sort((a, b) => b.validMinutes / b.requiredHours - a.validMinutes / a.requiredHours)
      .slice(0, 8),
  };
  res.json(dashboard);
});

systemRouter.get('/notifications', (req, res) => {
  res.json(listNotifications(req.admin!, req.query.filter === 'unread'));
});

systemRouter.get('/notifications/summary', (req, res) => {
  const admin = req.admin!;
  const scope = notificationScope(admin);
  const students = studentScope(admin);
  const summary: NotificationSummary = {
    unread: one<{ count: number }>(`SELECT COUNT(*) AS count FROM notifications n WHERE n.read_at IS NULL AND ${scope.sql}`, ...scope.params)!.count,
    pendingResets: one<{ count: number }>(
      `SELECT COUNT(*) AS count FROM password_reset_requests r JOIN students s ON s.id = r.student_id WHERE r.status = 'pending' AND ${students.sql}`,
      ...students.params,
    )!.count,
  };
  res.json(summary);
});

systemRouter.post('/notifications/read-all', (req, res) => {
  const scope = notificationScope(req.admin!);
  run(
    `UPDATE notifications SET read_at = ? WHERE read_at IS NULL AND id IN (SELECT n.id FROM notifications n WHERE ${scope.sql})`,
    nowIso(),
    ...scope.params,
  );
  res.status(204).end();
});

systemRouter.post('/notifications/:id/read', (req, res) => {
  const scope = notificationScope(req.admin!);
  const found = one(`SELECT n.id FROM notifications n WHERE n.id = ? AND ${scope.sql}`, req.params.id, ...scope.params);
  if (!found) throw notFound('La notificación no existe.');
  run('UPDATE notifications SET read_at = COALESCE(read_at, ?) WHERE id = ?', nowIso(), req.params.id);
  res.status(204).end();
});

systemRouter.post('/password-requests/:id/dismiss', (req, res) => {
  const scope = studentScope(req.admin!);
  const request = one<{ id: string }>(
    `SELECT r.id FROM password_reset_requests r JOIN students s ON s.id = r.student_id WHERE r.id = ? AND ${scope.sql}`,
    req.params.id,
    ...scope.params,
  );
  if (!request) throw notFound('La solicitud no existe.');
  const now = nowIso();
  run("UPDATE password_reset_requests SET status = 'dismissed', resolved_at = ?, resolved_by = ? WHERE id = ?", now, req.admin!.id, request.id);
  run("UPDATE notifications SET read_at = COALESCE(read_at, ?) WHERE type = 'password_reset' AND ref_id = ?", now, request.id);
  res.status(204).end();
});

systemRouter.get('/meta', (req, res) => {
  const admin = req.admin!;
  const meta: AdminMeta = {
    careers: many<{ career: string }>('SELECT DISTINCT career FROM students ORDER BY career COLLATE NOCASE').map(row => row.career),
    supervisors:
      admin.role === 'superadmin'
        ? many<{ id: string; full_name: string; area: string }>('SELECT id, full_name, area FROM admins WHERE active = 1 ORDER BY full_name COLLATE NOCASE').map(
            row => ({ id: row.id, fullName: row.full_name, area: row.area }),
          )
        : [{ id: admin.id, fullName: admin.fullName, area: admin.area }],
    smtpConfigured: smtpConfigured(),
    portalUrl: config.appOrigin,
    lateToleranceMinutes: config.lateToleranceMinutes,
  };
  res.json(meta);
});
