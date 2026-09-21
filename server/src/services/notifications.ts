import { randomUUID } from 'node:crypto';
import type { AdminProfile, AppNotification, NotificationType, ResetRequestStatus } from '../../../shared/contracts.ts';
import { many, nowIso, run, type Param } from '../db/index.ts';
import { formatDate, todayBounds } from '../lib/dates.ts';

interface NotifyInput {
  type: NotificationType;
  title: string;
  body: string;
  studentId?: string | null;
  refId?: string | null;
  /** Evita duplicados: si ya existe una notificación con esta llave, no se crea otra */
  dedupeKey?: string | null;
}

export function notify({ type, title, body, studentId = null, refId = null, dedupeKey = null }: NotifyInput) {
  run(
    'INSERT OR IGNORE INTO notifications (id, type, title, body, student_id, ref_id, dedupe_key) VALUES (?, ?, ?, ?, ?, ?, ?)',
    randomUUID(),
    type,
    title,
    body,
    studentId,
    refId,
    dedupeKey,
  );
}

/** Los responsables solo ven notificaciones de sus estudiantes */
export function notificationScope(admin: AdminProfile): { sql: string; params: Param[] } {
  return admin.role === 'superadmin'
    ? { sql: '1 = 1', params: [] }
    : { sql: 'n.student_id IN (SELECT id FROM students WHERE supervisor_id = ?)', params: [admin.id] };
}

interface NotificationRow {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  student_id: string | null;
  student_name: string | null;
  student_code: string | null;
  ref_id: string | null;
  request_status: ResetRequestStatus | null;
  read_at: string | null;
  created_at: string;
}

export function listNotifications(admin: AdminProfile, onlyUnread: boolean): AppNotification[] {
  const scope = notificationScope(admin);
  const rows = many<NotificationRow>(
    `SELECT n.*, s.full_name AS student_name, s.code AS student_code, r.status AS request_status
       FROM notifications n
       LEFT JOIN students s ON s.id = n.student_id
       LEFT JOIN password_reset_requests r ON n.type = 'password_reset' AND r.id = n.ref_id
      WHERE ${scope.sql} ${onlyUnread ? 'AND n.read_at IS NULL' : ''}
      ORDER BY n.created_at DESC
      LIMIT 300`,
    ...scope.params,
  );
  return rows.map(row => ({
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    studentId: row.student_id,
    studentName: row.student_name,
    studentCode: row.student_code,
    refId: row.ref_id,
    requestStatus: row.request_status,
    readAt: row.read_at,
    createdAt: row.created_at,
  }));
}

export function markStudentNotificationsRead(studentId: string, type: NotificationType) {
  run('UPDATE notifications SET read_at = ? WHERE student_id = ? AND type = ? AND read_at IS NULL', nowIso(), studentId, type);
}

/** Genera avisos para registros de días anteriores que se quedaron sin salida */
export function scanMissingCheckouts() {
  const rows = many<{ id: string; check_in: string; student_id: string; full_name: string; code: string }>(
    `SELECT a.id, a.check_in, s.id AS student_id, s.full_name, s.code
       FROM attendance a JOIN students s ON s.id = a.student_id
      WHERE a.check_out IS NULL AND a.check_in < ?`,
    todayBounds().start,
  );
  for (const row of rows) {
    notify({
      type: 'missing_checkout',
      title: 'Registro sin salida',
      body: `${row.full_name} (${row.code}) no registró su salida el ${formatDate(row.check_in)}. Las horas de ese día no contarán hasta corregirlo.`,
      studentId: row.student_id,
      refId: row.id,
      dedupeKey: `missing_checkout:${row.id}`,
    });
  }
}
