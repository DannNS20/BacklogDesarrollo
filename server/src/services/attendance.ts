import { randomUUID } from 'node:crypto';
import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
import type { AttendanceRecord, AttendanceRow, CheckResult, GeoPoint, RecordSource, RecordStatus } from '../../../shared/contracts.ts';
import { toMinutes } from '../../../shared/rules.ts';
import { config } from '../config.ts';
import { bool, nowIso, one, run, transaction } from '../db/index.ts';
import { formatTime, minutesBetween, minutesSinceMidnight, todayBounds } from '../lib/dates.ts';
import { removeEvidence, saveEvidence } from '../lib/evidence.ts';
import { badRequest } from '../lib/http.ts';
import { notify } from './notifications.ts';
import { refreshProgress, validMinutes, type StudentRow } from './students.ts';
import { verifyBiometric } from './webauthn.ts';

export interface AttendanceDbRow {
  id: string;
  student_id: string;
  check_in: string;
  check_out: string | null;
  check_in_photo: string | null;
  check_out_photo: string | null;
  check_in_geo: string | null;
  check_out_geo: string | null;
  check_in_biometric: number;
  check_out_biometric: number;
  late_minutes: number;
  source: RecordSource;
  status: RecordStatus;
  notes: string;
  review_note: string;
}

const MIN_GAP_MS = 60 * 1000;

function parseGeo(value: string | null): GeoPoint | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as GeoPoint;
  } catch {
    return null;
  }
}

export const toRecord = (row: AttendanceDbRow): AttendanceRecord => ({
  id: row.id,
  studentId: row.student_id,
  checkIn: row.check_in,
  checkOut: row.check_out,
  minutes: row.check_out ? minutesBetween(row.check_in, row.check_out) : 0,
  checkInEvidence: { photo: !!row.check_in_photo, geo: parseGeo(row.check_in_geo), biometric: row.check_in_biometric === 1 },
  checkOutEvidence: row.check_out
    ? { photo: !!row.check_out_photo, geo: parseGeo(row.check_out_geo), biometric: row.check_out_biometric === 1 }
    : null,
  lateMinutes: row.late_minutes,
  source: row.source,
  status: row.status,
  notes: row.notes,
  reviewNote: row.review_note,
});

export const toRow = (row: AttendanceDbRow & { student_name: string; student_code: string }): AttendanceRow => ({
  ...toRecord(row),
  studentName: row.student_name,
  studentCode: row.student_code,
});

export function openRecordToday(studentId: string) {
  const { start, end } = todayBounds();
  return one<AttendanceDbRow>(
    'SELECT * FROM attendance WHERE student_id = ? AND check_out IS NULL AND check_in BETWEEN ? AND ? ORDER BY check_in DESC LIMIT 1',
    studentId,
    start,
    end,
  );
}

interface CheckInput {
  photo: string;
  geo: GeoPoint | null;
  biometric: AuthenticationResponseJSON | null;
}

/**
 * Registro desde el portal del estudiante: alterna entrada/salida del día,
 * guarda la fotografía, la ubicación y, si se usó, la verificación biométrica.
 */
export async function registerCheck(student: StudentRow, input: CheckInput): Promise<CheckResult> {
  let biometricVerified = false;
  if (input.biometric) {
    await verifyBiometric(student.id, input.biometric);
    biometricVerified = true;
  }

  const photo = saveEvidence(input.photo);
  const geo = input.geo ? JSON.stringify(input.geo) : null;

  let outcome: { type: 'in' | 'out'; id: string; lateMinutes: number; slotStart: string | null };
  try {
    outcome = transaction(() => {
      const now = new Date();
      const timestamp = now.toISOString();
      const open = openRecordToday(student.id);

      if (open) {
        if (now.getTime() - Date.parse(open.check_in) < MIN_GAP_MS) {
          throw badRequest('Acabas de registrar tu entrada. Espera al menos un minuto para registrar tu salida.');
        }
        run(
          'UPDATE attendance SET check_out = ?, check_out_photo = ?, check_out_geo = ?, check_out_biometric = ?, updated_at = ? WHERE id = ?',
          timestamp,
          photo,
          geo,
          bool(biometricVerified),
          timestamp,
          open.id,
        );
        return { type: 'out' as const, id: open.id, lateMinutes: 0, slotStart: null };
      }

      const slot = one<{ start_time: string }>('SELECT start_time FROM schedules WHERE student_id = ? AND weekday = ?', student.id, now.getDay());
      const delay = slot ? minutesSinceMidnight(now) - toMinutes(slot.start_time) : 0;
      const lateMinutes = delay > config.lateToleranceMinutes ? delay : 0;
      const id = randomUUID();
      run(
        `INSERT INTO attendance (id, student_id, check_in, check_in_photo, check_in_geo, check_in_biometric, late_minutes, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'portal')`,
        id,
        student.id,
        timestamp,
        photo,
        geo,
        bool(biometricVerified),
        lateMinutes,
      );
      return { type: 'in' as const, id, lateMinutes, slotStart: slot?.start_time ?? null };
    });
  } catch (error) {
    removeEvidence(photo);
    throw error;
  }

  const record = one<AttendanceDbRow>('SELECT * FROM attendance WHERE id = ?', outcome.id)!;

  if (outcome.type === 'in' && outcome.lateMinutes > 0) {
    notify({
      type: 'late_arrival',
      title: 'Entrada con retardo',
      body: `${student.full_name} (${student.code}) registró su entrada a las ${formatTime(record.check_in)}, ${outcome.lateMinutes} min después de su horario (${outcome.slotStart}).`,
      studentId: student.id,
      refId: record.id,
      dedupeKey: `late_arrival:${record.id}`,
    });
  }
  if (outcome.type === 'out') refreshProgress(student.id);

  return {
    type: outcome.type,
    record: toRecord(record),
    validMinutes: validMinutes(student.id),
    requiredHours: student.required_hours,
    biometricVerified,
  };
}

export const markMissingCheckoutResolved = (recordId: string) =>
  run("UPDATE notifications SET read_at = ? WHERE type = 'missing_checkout' AND ref_id = ? AND read_at IS NULL", nowIso(), recordId);
