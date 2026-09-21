import { randomUUID } from 'node:crypto';
import { Router, type Request } from 'express';
import { z } from 'zod';
import type { GeneratedPassword, StudentDetail } from '../../../../shared/contracts.ts';
import { bool, nowIso, one, run, transaction } from '../../db/index.ts';
import { HttpError, parse } from '../../lib/http.ts';
import { sendMail } from '../../lib/mailer.ts';
import { generatePassword, hashPassword } from '../../lib/passwords.ts';
import { revokeSessions } from '../../lib/sessions.ts';
import { emailSchema, studentSchema } from '../../schemas.ts';
import { audit } from '../../services/audit.ts';
import { markStudentNotificationsRead } from '../../services/notifications.ts';
import {
  assertStudentAccess,
  assertUniqueStudent,
  getStudentDetail,
  listStudents,
  refreshProgress,
  replaceSchedule,
  resolveSupervisor,
} from '../../services/students.ts';

export const studentsRouter = Router();

const actor = (req: Request) => ({ type: 'admin' as const, id: req.admin!.id });

studentsRouter.get('/', (req, res) => {
  res.json(listStudents(req.admin!));
});

studentsRouter.get('/:id', (req, res) => {
  assertStudentAccess(req.admin!, req.params.id);
  res.json(getStudentDetail(req.params.id));
});

/** Alta de estudiante: la contraseña la genera el sistema y se muestra una sola vez */
studentsRouter.post('/', async (req, res) => {
  const admin = req.admin!;
  const data = parse(studentSchema, req.body);
  const supervisorId = resolveSupervisor(admin, data.supervisorId);
  assertUniqueStudent(data.code, data.email);

  const password = generatePassword();
  const passwordHash = await hashPassword(password);
  const id = randomUUID();

  transaction(() => {
    run(
      `INSERT INTO students (id, code, full_name, email, career, program, required_hours, start_date, supervisor_id, password_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      data.code,
      data.fullName,
      data.email,
      data.career,
      data.program,
      data.requiredHours,
      data.startDate,
      supervisorId,
      passwordHash,
    );
    replaceSchedule(id, data.schedule);
  });

  audit(actor(req), 'create', 'student', id, { code: data.code });
  const body: { student: StudentDetail } & GeneratedPassword = { student: getStudentDetail(id), password };
  res.status(201).json(body);
});

studentsRouter.put('/:id', (req, res) => {
  const admin = req.admin!;
  const { id } = req.params;
  assertStudentAccess(admin, id);
  const data = parse(studentSchema, req.body);
  const current = one<{ supervisor_id: string | null }>('SELECT supervisor_id FROM students WHERE id = ?', id)!;
  const supervisorId = admin.role === 'superadmin' ? resolveSupervisor(admin, data.supervisorId) : current.supervisor_id;
  assertUniqueStudent(data.code, data.email, id);

  transaction(() => {
    run(
      `UPDATE students SET code = ?, full_name = ?, email = ?, career = ?, program = ?, required_hours = ?, start_date = ?, supervisor_id = ?
        WHERE id = ?`,
      data.code,
      data.fullName,
      data.email,
      data.career,
      data.program,
      data.requiredHours,
      data.startDate,
      supervisorId,
      id,
    );
    replaceSchedule(id, data.schedule);
  });

  refreshProgress(id);
  audit(actor(req), 'update', 'student', id);
  res.json(getStudentDetail(id));
});

studentsRouter.patch('/:id/status', (req, res) => {
  const { id } = req.params;
  assertStudentAccess(req.admin!, id);
  const { active } = parse(z.object({ active: z.boolean() }), req.body);
  run('UPDATE students SET active = ? WHERE id = ?', bool(active), id);
  if (!active) revokeSessions('student', id);
  audit(actor(req), active ? 'activate' : 'deactivate', 'student', id);
  res.json(getStudentDetail(id));
});

/** Genera una contraseña nueva, cierra sus sesiones y atiende solicitudes pendientes */
studentsRouter.post('/:id/password', async (req, res) => {
  const admin = req.admin!;
  const { id } = req.params;
  assertStudentAccess(admin, id);

  const password = generatePassword();
  const passwordHash = await hashPassword(password);
  const resolvedAt = nowIso();
  transaction(() => {
    run('UPDATE students SET password_hash = ? WHERE id = ?', passwordHash, id);
    run(
      "UPDATE password_reset_requests SET status = 'resolved', resolved_at = ?, resolved_by = ? WHERE student_id = ? AND status = 'pending'",
      resolvedAt,
      admin.id,
      id,
    );
  });
  revokeSessions('student', id);
  markStudentNotificationsRead(id, 'password_reset');
  audit(actor(req), 'reset_password', 'student', id);
  const body: GeneratedPassword = { password };
  res.json(body);
});

studentsRouter.post('/:id/email', async (req, res) => {
  const { id } = req.params;
  assertStudentAccess(req.admin!, id);
  const data = parse(emailSchema, req.body);
  const { email } = one<{ email: string }>('SELECT email FROM students WHERE id = ?', id)!;
  try {
    const result = await sendMail({ to: email, subject: data.subject, text: data.body });
    audit(actor(req), 'send_email', 'student', id, { subject: data.subject, mode: result.mode });
    res.json(result);
  } catch (error) {
    console.error(error);
    throw new HttpError(502, 'No se pudo enviar el correo. Revisa la configuración SMTP del servidor.');
  }
});

studentsRouter.delete('/:id/biometrics', (req, res) => {
  const { id } = req.params;
  assertStudentAccess(req.admin!, id);
  run('DELETE FROM webauthn_credentials WHERE student_id = ?', id);
  audit(actor(req), 'remove_biometrics', 'student', id);
  res.json(getStudentDetail(id));
});
