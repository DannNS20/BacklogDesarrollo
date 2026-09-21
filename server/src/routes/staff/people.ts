import { randomUUID } from 'node:crypto';
import { Router, type Request } from 'express';
import { z } from 'zod';
import type { GeneratedPassword, Person } from '../../../../shared/contracts.ts';
import { bool, one, run } from '../../db/index.ts';
import { HttpError, parse } from '../../lib/http.ts';
import { sendMail } from '../../lib/mailer.ts';
import { generatePassword, hashPassword } from '../../lib/passwords.ts';
import { revokeSessions } from '../../lib/sessions.ts';
import { emailSchema, personSchema } from '../../schemas.ts';
import { audit } from '../../services/audit.ts';
import { assertUniquePerson, getPerson, listPeople } from '../../services/people.ts';

/** Alta y baja de personas con credencial (solo administración) */
export const peopleRouter = Router();

const actor = (req: Request) => ({ type: 'staff' as const, id: req.staff!.id });

peopleRouter.get('/', (_req, res) => {
  res.json(listPeople());
});

peopleRouter.get('/:id', (req, res) => {
  res.json(getPerson(req.params.id));
});

peopleRouter.post('/', async (req, res) => {
  const data = parse(personSchema, req.body);
  assertUniquePerson(data.code, data.email);

  const password = generatePassword();
  const id = randomUUID();
  run(
    'INSERT INTO people (id, code, full_name, email, role, program, credential_expires_at, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    id,
    data.code,
    data.fullName,
    data.email,
    data.role,
    data.program,
    data.credentialExpiresAt,
    await hashPassword(password),
  );
  audit(actor(req), 'create', 'person', id, { code: data.code, role: data.role });
  const body: { person: Person } & GeneratedPassword = { person: getPerson(id), password };
  res.status(201).json(body);
});

peopleRouter.put('/:id', (req, res) => {
  const { id } = req.params;
  getPerson(id);
  const data = parse(personSchema, req.body);
  assertUniquePerson(data.code, data.email, id);
  run(
    'UPDATE people SET code = ?, full_name = ?, email = ?, role = ?, program = ?, credential_expires_at = ? WHERE id = ?',
    data.code,
    data.fullName,
    data.email,
    data.role,
    data.program,
    data.credentialExpiresAt,
    id,
  );
  audit(actor(req), 'update', 'person', id);
  res.json(getPerson(id));
});

/** La baja revoca el acceso y conserva el historial */
peopleRouter.patch('/:id/status', (req, res) => {
  const { id } = req.params;
  getPerson(id);
  const { active } = parse(z.object({ active: z.boolean() }), req.body);
  run('UPDATE people SET active = ? WHERE id = ?', bool(active), id);
  if (!active) revokeSessions('person', id);
  audit(actor(req), active ? 'activate' : 'deactivate', 'person', id);
  res.json(getPerson(id));
});

peopleRouter.post('/:id/password', async (req, res) => {
  const { id } = req.params;
  getPerson(id);
  const password = generatePassword();
  run('UPDATE people SET password_hash = ? WHERE id = ?', await hashPassword(password), id);
  revokeSessions('person', id);
  audit(actor(req), 'reset_password', 'person', id);
  const body: GeneratedPassword = { password };
  res.json(body);
});

peopleRouter.post('/:id/email', async (req, res) => {
  const { id } = req.params;
  const person = getPerson(id);
  const data = parse(emailSchema, req.body);
  try {
    const result = await sendMail({ to: person.email, subject: data.subject, text: data.body });
    audit(actor(req), 'send_email', 'person', id, { subject: data.subject, mode: result.mode });
    res.json(result);
  } catch (error) {
    console.error(error);
    throw new HttpError(502, 'No se pudo enviar el correo. Revisa la configuración SMTP del servidor.');
  }
});

/** Para cuando la persona cambia de teléfono o lo pierde */
peopleRouter.delete('/:id/biometrics', (req, res) => {
  const { id } = req.params;
  getPerson(id);
  run('DELETE FROM webauthn_credentials WHERE person_id = ?', id);
  audit(actor(req), 'remove_biometrics', 'person', id);
  res.json(getPerson(id));
});

export const peopleOptions = () =>
  listPeople().map(person => ({ id: person.id, fullName: person.fullName, code: person.code, role: person.role, active: person.active }));

/** Catálogo ligero para los formularios de vigilancia */
export const peopleLookupRouter = Router().get('/', (_req, res) => {
  res.json(peopleOptions());
});

export const emailExists = (email: string) => !!one('SELECT id FROM people WHERE email = ?', email);
