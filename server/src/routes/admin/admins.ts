import { randomUUID } from 'node:crypto';
import { Router, type Request } from 'express';
import { z } from 'zod';
import type { AdminListItem, AdminProfile, GeneratedPassword } from '../../../../shared/contracts.ts';
import { bool, many, one, run } from '../../db/index.ts';
import { badRequest, conflict, HttpError, notFound, parse } from '../../lib/http.ts';
import { sendMail } from '../../lib/mailer.ts';
import { generatePassword, hashPassword } from '../../lib/passwords.ts';
import { revokeSessions } from '../../lib/sessions.ts';
import { adminSchema, emailSchema } from '../../schemas.ts';
import { toAdminProfile, type AdminRow } from '../../services/admins.ts';
import { audit } from '../../services/audit.ts';

/** Gestión de responsables (solo administrador general) */
export const adminsRouter = Router();

const actor = (req: Request) => ({ type: 'admin' as const, id: req.admin!.id });

function findAdmin(id: string): AdminRow {
  const row = one<AdminRow>('SELECT * FROM admins WHERE id = ?', id);
  if (!row) throw notFound('El responsable no existe.');
  return row;
}

function assertUniqueEmail(email: string, exceptId = '') {
  if (one('SELECT id FROM admins WHERE email = ? AND id <> ?', email, exceptId)) {
    throw conflict('Ya existe un responsable registrado con ese correo.');
  }
}

adminsRouter.get('/', (_req, res) => {
  const rows = many<AdminRow & { student_count: number }>(
    `SELECT a.*, (SELECT COUNT(*) FROM students s WHERE s.supervisor_id = a.id) AS student_count
       FROM admins a
      ORDER BY a.role DESC, a.full_name COLLATE NOCASE`,
  );
  const list: AdminListItem[] = rows.map(row => ({ ...toAdminProfile(row), studentCount: row.student_count }));
  res.json(list);
});

adminsRouter.post('/', async (req, res) => {
  const data = parse(adminSchema, req.body);
  assertUniqueEmail(data.email);
  const password = generatePassword();
  const id = randomUUID();
  run(
    'INSERT INTO admins (id, email, full_name, area, role, password_hash) VALUES (?, ?, ?, ?, ?, ?)',
    id,
    data.email,
    data.fullName,
    data.area,
    data.role,
    await hashPassword(password),
  );
  audit(actor(req), 'create', 'admin', id, { email: data.email, role: data.role });
  const body: { admin: AdminProfile } & GeneratedPassword = { admin: toAdminProfile(findAdmin(id)), password };
  res.status(201).json(body);
});

adminsRouter.put('/:id', (req, res) => {
  const current = findAdmin(req.params.id);
  const data = parse(adminSchema, req.body);
  if (current.id === req.admin!.id && data.role !== 'superadmin') {
    throw badRequest('No puedes quitarte a ti mismo el rol de administrador general.');
  }
  assertUniqueEmail(data.email, current.id);
  run('UPDATE admins SET email = ?, full_name = ?, area = ?, role = ? WHERE id = ?', data.email, data.fullName, data.area, data.role, current.id);
  audit(actor(req), 'update', 'admin', current.id);
  res.json(toAdminProfile(findAdmin(current.id)));
});

adminsRouter.patch('/:id/status', (req, res) => {
  const current = findAdmin(req.params.id);
  const { active } = parse(z.object({ active: z.boolean() }), req.body);
  if (current.id === req.admin!.id) throw badRequest('No puedes desactivar tu propia cuenta.');
  run('UPDATE admins SET active = ? WHERE id = ?', bool(active), current.id);
  if (!active) revokeSessions('admin', current.id);
  audit(actor(req), active ? 'activate' : 'deactivate', 'admin', current.id);
  res.json(toAdminProfile(findAdmin(current.id)));
});

adminsRouter.post('/:id/password', async (req, res) => {
  const current = findAdmin(req.params.id);
  const password = generatePassword();
  run('UPDATE admins SET password_hash = ? WHERE id = ?', await hashPassword(password), current.id);
  revokeSessions('admin', current.id);
  audit(actor(req), 'reset_password', 'admin', current.id);
  const body: GeneratedPassword = { password };
  res.json(body);
});

adminsRouter.post('/:id/email', async (req, res) => {
  const current = findAdmin(req.params.id);
  const data = parse(emailSchema, req.body);
  try {
    const result = await sendMail({ to: current.email, subject: data.subject, text: data.body });
    audit(actor(req), 'send_email', 'admin', current.id, { subject: data.subject, mode: result.mode });
    res.json(result);
  } catch (error) {
    console.error(error);
    throw new HttpError(502, 'No se pudo enviar el correo. Revisa la configuración SMTP del servidor.');
  }
});
