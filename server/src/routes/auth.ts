import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import type { StudentSession } from '../../../shared/contracts.ts';
import { nowIso, one, run } from '../db/index.ts';
import { forbidden, parse, unauthorized } from '../lib/http.ts';
import { verifyPassword } from '../lib/passwords.ts';
import { clearRateLimit, hitRateLimit, MINUTE } from '../lib/rateLimit.ts';
import { endSession, startSession } from '../lib/sessions.ts';
import { toAdminProfile, type AdminRow } from '../services/admins.ts';
import { audit } from '../services/audit.ts';
import { notify } from '../services/notifications.ts';
import type { StudentRow } from '../services/students.ts';

export const authRouter = Router();

const password = z.string().min(1, 'Escribe tu contraseña.').max(200);

const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, 'Escribe tu correo institucional.').max(200),
  password,
});

const studentLoginSchema = z.object({
  identifier: z.string().trim().toLowerCase().min(1, 'Escribe tu código o correo institucional.').max(200),
  password,
});

const resetRequestSchema = z.object({
  code: z.string().trim().min(1, 'Escribe tu código de estudiante.').max(20),
  email: z.string().trim().toLowerCase().min(1, 'Escribe tu correo institucional.').max(200),
  message: z.string().trim().max(300, 'El mensaje debe tener máximo 300 caracteres.').default(''),
});

/* ---------- Portal administrativo ---------- */

authRouter.post('/admin/login', async (req, res) => {
  const { email, password } = parse(adminLoginSchema, req.body);
  const limiterKey = `admin-login:${req.ip}:${email}`;
  hitRateLimit(limiterKey, 5, 15 * MINUTE);

  // Solo pueden entrar correos previamente registrados como responsables
  const admin = one<AdminRow>('SELECT * FROM admins WHERE email = ?', email);
  const valid = await verifyPassword(password, admin?.password_hash ?? null);
  if (!admin || !valid) throw unauthorized('Correo institucional o contraseña incorrectos.');
  if (!admin.active) throw forbidden('Tu cuenta está desactivada. Contacta al administrador general.');

  clearRateLimit(limiterKey);
  const loginAt = nowIso();
  run('UPDATE admins SET last_login_at = ? WHERE id = ?', loginAt, admin.id);
  startSession(res, 'admin', admin.id, req.get('user-agent'));
  audit({ type: 'admin', id: admin.id }, 'login', 'admin', admin.id);
  res.json(toAdminProfile({ ...admin, last_login_at: loginAt }));
});

authRouter.post('/admin/logout', (req, res) => {
  endSession(req, res, 'admin');
  res.status(204).end();
});

/* ---------- Portal del estudiante ---------- */

authRouter.post('/student/login', async (req, res) => {
  const { identifier, password } = parse(studentLoginSchema, req.body);
  const limiterKey = `student-login:${req.ip}:${identifier}`;
  hitRateLimit(limiterKey, 5, 15 * MINUTE);

  const student = one<StudentRow>('SELECT * FROM students WHERE code = ? OR email = ?', identifier, identifier);
  const valid = await verifyPassword(password, student?.password_hash ?? null);
  if (!student || !valid) throw unauthorized('Código o correo y contraseña no coinciden.');
  if (!student.active) throw forbidden('Tu cuenta está inactiva. Acude a la Coordinación de Servicio Social.');

  clearRateLimit(limiterKey);
  run('UPDATE students SET last_login_at = ? WHERE id = ?', nowIso(), student.id);
  startSession(res, 'student', student.id, req.get('user-agent'));
  const session: StudentSession = { id: student.id, code: student.code, fullName: student.full_name, email: student.email };
  res.json(session);
});

authRouter.post('/student/logout', (req, res) => {
  endSession(req, res, 'student');
  res.status(204).end();
});

/**
 * El estudiante no puede cambiar su contraseña: solicita una nueva y el
 * administrador la genera. La respuesta es siempre la misma para no revelar
 * qué códigos existen.
 */
authRouter.post('/student/password-reset', (req, res) => {
  const data = parse(resetRequestSchema, req.body);
  hitRateLimit(`password-reset:${req.ip}`, 5, 60 * MINUTE);

  const student = one<Pick<StudentRow, 'id' | 'full_name' | 'code'>>(
    'SELECT id, full_name, code FROM students WHERE code = ? AND email = ? AND active = 1',
    data.code,
    data.email,
  );
  if (student) {
    const pending = one<{ id: string }>("SELECT id FROM password_reset_requests WHERE student_id = ? AND status = 'pending'", student.id);
    if (!pending) {
      const requestId = randomUUID();
      run('INSERT INTO password_reset_requests (id, student_id, message) VALUES (?, ?, ?)', requestId, student.id, data.message);
      notify({
        type: 'password_reset',
        title: 'Solicitud de nueva contraseña',
        body: `${student.full_name} (${student.code}) solicitó una nueva contraseña de acceso.${data.message ? ` Mensaje: “${data.message}”` : ''}`,
        studentId: student.id,
        refId: requestId,
        dedupeKey: `password_reset:${requestId}`,
      });
    }
  }
  res.json({ ok: true });
});
