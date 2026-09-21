import { randomUUID } from 'node:crypto';
import type { Alert, AlertSummary, AlertType } from '../../../shared/contracts.ts';
import { many, nowIso, one, run } from '../db/index.ts';

interface AlertInput {
  type: AlertType;
  title: string;
  body: string;
  personId?: string | null;
  accessPointId?: string | null;
  refId?: string | null;
  /** Evita repetir la misma alerta (por ejemplo, una por persona y día) */
  dedupeKey?: string | null;
}

export function raiseAlert({ type, title, body, personId = null, accessPointId = null, refId = null, dedupeKey = null }: AlertInput) {
  run(
    'INSERT OR IGNORE INTO alerts (id, type, title, body, person_id, access_point_id, ref_id, dedupe_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    randomUUID(),
    type,
    title,
    body,
    personId,
    accessPointId,
    refId,
    dedupeKey,
  );
}

interface AlertRow {
  id: string;
  type: AlertType;
  title: string;
  body: string;
  person_id: string | null;
  person_name: string | null;
  access_point_name: string | null;
  read_at: string | null;
  reviewed_by_name: string | null;
  created_at: string;
}

const ALERTS_SQL = `
  SELECT a.id, a.type, a.title, a.body, a.person_id, a.read_at, a.created_at,
         p.full_name AS person_name, ap.name AS access_point_name, s.full_name AS reviewed_by_name
    FROM alerts a
    LEFT JOIN people p ON p.id = a.person_id
    LEFT JOIN access_points ap ON ap.id = a.access_point_id
    LEFT JOIN staff s ON s.id = a.reviewed_by`;

const toAlert = (row: AlertRow): Alert => ({
  id: row.id,
  type: row.type,
  title: row.title,
  body: row.body,
  personId: row.person_id,
  personName: row.person_name,
  accessPointName: row.access_point_name,
  readAt: row.read_at,
  reviewedByName: row.reviewed_by_name,
  createdAt: row.created_at,
});

export const listAlerts = (onlyUnread: boolean): Alert[] =>
  many<AlertRow>(`${ALERTS_SQL} ${onlyUnread ? 'WHERE a.read_at IS NULL' : ''} ORDER BY a.created_at DESC LIMIT 300`).map(toAlert);

export function reviewAlert(id: string, staffId: string): Alert {
  run('UPDATE alerts SET read_at = COALESCE(read_at, ?), reviewed_by = COALESCE(reviewed_by, ?) WHERE id = ?', nowIso(), staffId, id);
  return toAlert(one<AlertRow>(`${ALERTS_SQL} WHERE a.id = ?`, id)!);
}

export function reviewAllAlerts(staffId: string) {
  run('UPDATE alerts SET read_at = ?, reviewed_by = COALESCE(reviewed_by, ?) WHERE read_at IS NULL', nowIso(), staffId);
}

export const alertSummary = (): AlertSummary => ({
  unread: one<{ count: number }>('SELECT COUNT(*) AS count FROM alerts WHERE read_at IS NULL')!.count,
  openIncidents: one<{ count: number }>("SELECT COUNT(*) AS count FROM access_records WHERE status = 'incidencia'")!.count,
});
