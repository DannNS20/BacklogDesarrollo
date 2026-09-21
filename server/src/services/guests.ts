import { randomUUID } from 'node:crypto';
import type { GuestPass, GuestPassInput, GuestPassStatus } from '../../../shared/contracts.ts';
import { many, nowIso, one, run, transaction } from '../db/index.ts';
import { dateKey, minutesBetween } from '../lib/dates.ts';
import { conflict, notFound } from '../lib/http.ts';
import { raiseAlert } from './alerts.ts';
import { getAccessPoint } from './access.ts';

interface GuestPassRow {
  id: string;
  full_name: string;
  document: string;
  reason: string;
  host_name: string;
  access_point_id: string | null;
  valid_date: string;
  closed_at: string | null;
  created_at: string;
  access_point_name: string | null;
  issued_by_name: string | null;
  inside_since: string | null;
}

const PASSES_SQL = `
  SELECT g.*, ap.name AS access_point_name, s.full_name AS issued_by_name,
         (SELECT MAX(r.check_in) FROM access_records r WHERE r.guest_pass_id = g.id AND r.check_out IS NULL) AS inside_since
    FROM guest_passes g
    LEFT JOIN access_points ap ON ap.id = g.access_point_id
    LEFT JOIN staff s ON s.id = g.issued_by`;

function statusOf(row: GuestPassRow): GuestPassStatus {
  if (row.closed_at) return 'cerrado';
  return row.valid_date < dateKey(new Date()) ? 'expirado' : 'activo';
}

const toPass = (row: GuestPassRow): GuestPass => ({
  id: row.id,
  fullName: row.full_name,
  document: row.document,
  reason: row.reason,
  hostName: row.host_name,
  accessPointId: row.access_point_id,
  accessPointName: row.access_point_name ?? 'Acceso eliminado',
  issuedByName: row.issued_by_name,
  validDate: row.valid_date,
  status: statusOf(row),
  createdAt: row.created_at,
  closedAt: row.closed_at,
  insideSince: row.inside_since,
  minutesInside: row.inside_since ? minutesBetween(row.inside_since, nowIso()) : 0,
});

export const listGuestPasses = (date?: string): GuestPass[] =>
  many<GuestPassRow>(
    `${PASSES_SQL} ${date ? 'WHERE g.valid_date = ?' : ''} ORDER BY g.created_at DESC LIMIT 300`,
    ...(date ? [date] : []),
  ).map(toPass);

const findPass = (id: string) => {
  const row = one<GuestPassRow>(`${PASSES_SQL} WHERE g.id = ?`, id);
  if (!row) throw notFound('El pase de invitado no existe.');
  return row;
};

/** Emite el pase del día y registra la entrada del visitante */
export function issueGuestPass(input: GuestPassInput, staffId: string): GuestPass {
  const point = getAccessPoint(input.accessPointId);
  const id = randomUUID();
  const timestamp = nowIso();
  transaction(() => {
    run(
      'INSERT INTO guest_passes (id, full_name, document, reason, host_name, access_point_id, issued_by, valid_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      id,
      input.fullName,
      input.document,
      input.reason,
      input.hostName,
      point.id,
      staffId,
      dateKey(new Date()),
    );
    run(
      `INSERT INTO access_records (id, guest_pass_id, access_point_id, check_in, source, notes, registered_by)
       VALUES (?, ?, ?, ?, 'manual', ?, ?)`,
      randomUUID(),
      id,
      point.id,
      timestamp,
      `Pase de invitado: ${input.reason}`,
      staffId,
    );
  });
  return toPass(findPass(id));
}

/** Nueva entrada con un pase ya emitido; rechaza los pases caducados */
export function reenterGuest(id: string, staffId: string): GuestPass {
  const row = findPass(id);
  const status = statusOf(row);
  if (status === 'expirado') {
    raiseAlert({
      type: 'pase_vencido',
      title: 'Intento de reingreso con pase vencido',
      body: `${row.full_name} intentó reingresar con un pase del ${row.valid_date}.`,
      accessPointId: row.access_point_id,
      refId: row.id,
      dedupeKey: `pase_vencido:${row.id}:${dateKey(new Date())}`,
    });
    throw conflict(`El pase de ${row.full_name} caducó el ${row.valid_date}. Emite uno nuevo.`);
  }
  if (row.inside_since) throw conflict(`${row.full_name} ya está dentro del campus.`);
  run(
    `INSERT INTO access_records (id, guest_pass_id, access_point_id, check_in, source, notes, registered_by)
     VALUES (?, ?, ?, ?, 'manual', 'Reingreso con pase vigente', ?)`,
    randomUUID(),
    row.id,
    row.access_point_id,
    nowIso(),
    staffId,
  );
  return toPass(findPass(row.id));
}

/** Registra la salida del visitante y cierra su pase */
export function closeGuestPass(id: string, staffId: string): GuestPass {
  const row = findPass(id);
  if (row.closed_at) throw conflict(`El pase de ${row.full_name} ya fue cerrado.`);
  const timestamp = nowIso();
  transaction(() => {
    run(
      'UPDATE access_records SET check_out = ?, registered_by = ?, updated_at = ? WHERE guest_pass_id = ? AND check_out IS NULL',
      timestamp,
      staffId,
      timestamp,
      row.id,
    );
    run('UPDATE guest_passes SET closed_at = ? WHERE id = ?', timestamp, row.id);
  });
  return toPass(findPass(row.id));
}
