import type { AdminProfile, ScheduleSlot, StudentDetail, StudentSummary } from '../../../shared/contracts.ts';
import { many, nowIso, one, run, type Param } from '../db/index.ts';
import { todayBounds } from '../lib/dates.ts';
import { badRequest, conflict, forbidden, notFound } from '../lib/http.ts';
import { notify } from './notifications.ts';

export interface StudentRow {
  id: string;
  code: string;
  full_name: string;
  email: string;
  career: string;
  program: string;
  required_hours: number;
  start_date: string | null;
  supervisor_id: string | null;
  password_hash: string;
  active: number;
  completed_at: string | null;
  created_at: string;
  last_login_at: string | null;
}

/** Minutos de una sesión calculados en SQL (mismo redondeo que minutesBetween) */
export const minutesSql = (alias: string) =>
  `CAST(ROUND((julianday(${alias}.check_out) - julianday(${alias}.check_in)) * 1440, 3) AS INTEGER)`;

export interface Scope {
  sql: string;
  params: Param[];
}

/** El administrador general ve a todos; cada responsable solo a sus estudiantes */
export const studentScope = (admin: AdminProfile, alias = 's'): Scope =>
  admin.role === 'superadmin' ? { sql: '1 = 1', params: [] } : { sql: `${alias}.supervisor_id = ?`, params: [admin.id] };

interface SummaryRow extends Omit<StudentRow, 'password_hash'> {
  supervisor_name: string | null;
  supervisor_email: string | null;
  valid_minutes: number;
  sessions: number;
  last_check_in: string | null;
  open_today: number;
}

const SUMMARY_SQL = `
  SELECT s.id, s.code, s.full_name, s.email, s.career, s.program, s.required_hours, s.start_date, s.supervisor_id,
         s.active, s.completed_at, s.created_at, s.last_login_at,
         sup.full_name AS supervisor_name, sup.email AS supervisor_email,
         COALESCE((SELECT SUM(${minutesSql('x')}) FROM attendance x
                    WHERE x.student_id = s.id AND x.status = 'valid' AND x.check_out IS NOT NULL), 0) AS valid_minutes,
         (SELECT COUNT(*) FROM attendance x WHERE x.student_id = s.id AND x.status = 'valid' AND x.check_out IS NOT NULL) AS sessions,
         (SELECT MAX(x.check_in) FROM attendance x WHERE x.student_id = s.id) AS last_check_in,
         (SELECT COUNT(*) FROM attendance x WHERE x.student_id = s.id AND x.check_out IS NULL AND x.check_in >= ?) AS open_today
    FROM students s
    LEFT JOIN admins sup ON sup.id = s.supervisor_id`;

const toSummary = (row: SummaryRow): StudentSummary => ({
  id: row.id,
  code: row.code,
  fullName: row.full_name,
  email: row.email,
  career: row.career,
  program: row.program,
  requiredHours: row.required_hours,
  startDate: row.start_date,
  active: row.active === 1,
  supervisorId: row.supervisor_id,
  supervisorName: row.supervisor_name,
  validMinutes: row.valid_minutes,
  sessions: row.sessions,
  lastCheckIn: row.last_check_in,
  inService: row.open_today > 0,
  completedAt: row.completed_at,
  createdAt: row.created_at,
});

export function listStudents(admin: AdminProfile): StudentSummary[] {
  const scope = studentScope(admin);
  return many<SummaryRow>(
    `${SUMMARY_SQL} WHERE ${scope.sql} ORDER BY s.full_name COLLATE NOCASE`,
    todayBounds().start,
    ...scope.params,
  ).map(toSummary);
}

export function findSummaryRow(id: string) {
  return one<SummaryRow>(`${SUMMARY_SQL} WHERE s.id = ?`, todayBounds().start, id);
}

export function getSchedule(studentId: string): ScheduleSlot[] {
  return many<ScheduleSlot>(
    'SELECT weekday, start_time AS start, end_time AS "end" FROM schedules WHERE student_id = ? ORDER BY weekday',
    studentId,
  );
}

export function getStudentDetail(id: string): StudentDetail {
  const row = findSummaryRow(id);
  if (!row) throw notFound('El estudiante no existe.');
  const extra = one<{ devices: number; late: number; pending: string | null }>(
    `SELECT (SELECT COUNT(*) FROM webauthn_credentials WHERE student_id = ?) AS devices,
            (SELECT COUNT(*) FROM attendance WHERE student_id = ? AND late_minutes > 0) AS late,
            (SELECT id FROM password_reset_requests WHERE student_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1) AS pending`,
    id,
    id,
    id,
  )!;
  return {
    ...toSummary(row),
    schedule: getSchedule(id),
    biometricDevices: extra.devices,
    lateCount: extra.late,
    pendingResetRequestId: extra.pending,
    lastLoginAt: row.last_login_at,
  };
}

export function assertStudentAccess(admin: AdminProfile, studentId: string) {
  const row = one<{ supervisor_id: string | null }>('SELECT supervisor_id FROM students WHERE id = ?', studentId);
  if (!row) throw notFound('El estudiante no existe.');
  if (admin.role !== 'superadmin' && row.supervisor_id !== admin.id) {
    throw forbidden('Este estudiante está asignado a otro responsable.');
  }
}

export function assertUniqueStudent(code: string, email: string, exceptId = '') {
  const existing = one<{ code: string; email: string }>(
    'SELECT code, email FROM students WHERE (code = ? OR email = ?) AND id <> ?',
    code,
    email,
    exceptId,
  );
  if (existing?.code === code) throw conflict('Ya existe un estudiante registrado con ese código.');
  if (existing) throw conflict('Ya existe un estudiante registrado con ese correo institucional.');
}

/** Un responsable siempre queda como supervisor de los estudiantes que registra */
export function resolveSupervisor(admin: AdminProfile, requested: string | null): string | null {
  if (admin.role !== 'superadmin') return admin.id;
  if (!requested) return null;
  const supervisor = one<{ id: string }>('SELECT id FROM admins WHERE id = ? AND active = 1', requested);
  if (!supervisor) throw badRequest('El responsable seleccionado no existe o está inactivo.');
  return supervisor.id;
}

export function replaceSchedule(studentId: string, schedule: ScheduleSlot[]) {
  run('DELETE FROM schedules WHERE student_id = ?', studentId);
  for (const slot of schedule) {
    run('INSERT INTO schedules (student_id, weekday, start_time, end_time) VALUES (?, ?, ?, ?)', studentId, slot.weekday, slot.start, slot.end);
  }
}

export function validMinutes(studentId: string): number {
  return (
    one<{ total: number | null }>(
      `SELECT SUM(${minutesSql('a')}) AS total FROM attendance a
        WHERE a.student_id = ? AND a.status = 'valid' AND a.check_out IS NOT NULL`,
      studentId,
    )?.total ?? 0
  );
}

/** Recalcula el avance y genera avisos de hitos o de servicio completado */
export function refreshProgress(studentId: string) {
  const student = one<Pick<StudentRow, 'full_name' | 'code' | 'required_hours' | 'completed_at'>>(
    'SELECT full_name, code, required_hours, completed_at FROM students WHERE id = ?',
    studentId,
  );
  if (!student) return;

  const minutes = validMinutes(studentId);
  const ratio = minutes / (student.required_hours * 60);

  if (ratio >= 1 && !student.completed_at) {
    run('UPDATE students SET completed_at = ? WHERE id = ?', nowIso(), studentId);
    notify({
      type: 'hours_completed',
      title: 'Servicio social completado',
      body: `${student.full_name} (${student.code}) completó sus ${student.required_hours} horas de servicio social. Ya puede iniciar su trámite de liberación.`,
      studentId,
      dedupeKey: `hours_completed:${studentId}`,
    });
  } else if (ratio < 1 && student.completed_at) {
    run('UPDATE students SET completed_at = NULL WHERE id = ?', studentId);
  }

  for (const milestone of [50, 90]) {
    if (ratio * 100 >= milestone && ratio < 1) {
      notify({
        type: 'milestone',
        title: `Avance del ${milestone}%`,
        body: `${student.full_name} (${student.code}) alcanzó el ${milestone}% de sus horas: ${Math.floor(minutes / 60)} de ${student.required_hours} h.`,
        studentId,
        dedupeKey: `milestone:${milestone}:${studentId}`,
      });
    }
  }
}
