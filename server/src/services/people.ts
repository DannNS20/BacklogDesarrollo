import type { Person, PersonRole } from '../../../shared/contracts.ts';
import { credentialValid } from '../../../shared/rules.ts';
import { many, one } from '../db/index.ts';
import { conflict, notFound } from '../lib/http.ts';
import { openRecordCutoff } from './access.ts';

export interface PersonRow {
  id: string;
  code: string;
  full_name: string;
  email: string;
  role: PersonRole;
  program: string;
  credential_expires_at: string | null;
  password_hash: string;
  active: number;
  created_at: string;
  last_login_at: string | null;
}

interface PersonSummaryRow extends Omit<PersonRow, 'password_hash'> {
  devices: number;
  total_records: number;
  last_access: string | null;
  inside: number;
}

const SUMMARY_SQL = `
  SELECT p.id, p.code, p.full_name, p.email, p.role, p.program, p.credential_expires_at, p.active, p.created_at, p.last_login_at,
         (SELECT COUNT(*) FROM webauthn_credentials w WHERE w.person_id = p.id) AS devices,
         (SELECT COUNT(*) FROM access_records r WHERE r.person_id = p.id) AS total_records,
         (SELECT MAX(COALESCE(r.check_out, r.check_in)) FROM access_records r WHERE r.person_id = p.id) AS last_access,
         EXISTS(SELECT 1 FROM access_records r WHERE r.person_id = p.id AND r.check_out IS NULL AND r.check_in >= ?) AS inside
    FROM people p`;

const toPerson = (row: PersonSummaryRow): Person => ({
  id: row.id,
  code: row.code,
  fullName: row.full_name,
  email: row.email,
  role: row.role,
  program: row.program,
  credentialExpiresAt: row.credential_expires_at,
  active: row.active === 1,
  createdAt: row.created_at,
  lastLoginAt: row.last_login_at,
  biometricDevices: row.devices,
  inside: row.inside === 1,
  lastAccessAt: row.last_access,
  totalRecords: row.total_records,
});

export const listPeople = (): Person[] =>
  many<PersonSummaryRow>(`${SUMMARY_SQL} ORDER BY p.full_name COLLATE NOCASE`, openRecordCutoff()).map(toPerson);

export function getPerson(id: string): Person {
  const row = one<PersonSummaryRow>(`${SUMMARY_SQL} WHERE p.id = ?`, openRecordCutoff(), id);
  if (!row) throw notFound('La persona no existe.');
  return toPerson(row);
}

export function assertUniquePerson(code: string, email: string, exceptId = '') {
  const existing = one<{ code: string }>('SELECT code FROM people WHERE (code = ? OR email = ?) AND id <> ?', code, email, exceptId);
  if (existing?.code === code) throw conflict('Ya existe una persona registrada con ese código o matrícula.');
  if (existing) throw conflict('Ya existe una persona registrada con ese correo institucional.');
}

export const personCredentialValid = (row: PersonRow) =>
  credentialValid({ active: row.active === 1, credentialExpiresAt: row.credential_expires_at });
