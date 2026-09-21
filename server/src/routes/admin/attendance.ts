import { randomUUID } from 'node:crypto';
import { Router, type Request } from 'express';
import { z } from 'zod';
import type { AdminProfile } from '../../../../shared/contracts.ts';
import { DATE_RE } from '../../../../shared/rules.ts';
import { many, nowIso, one, run, type Param } from '../../db/index.ts';
import { dayBounds } from '../../lib/dates.ts';
import { evidencePath, removeEvidence } from '../../lib/evidence.ts';
import { forbidden, notFound, parse } from '../../lib/http.ts';
import { manualRecordSchema, recordSchema, reviewSchema } from '../../schemas.ts';
import { markMissingCheckoutResolved, toRow, type AttendanceDbRow } from '../../services/attendance.ts';
import { audit } from '../../services/audit.ts';
import { assertStudentAccess, refreshProgress, studentScope } from '../../services/students.ts';

export const attendanceRouter = Router();

type JoinedRow = AttendanceDbRow & { student_name: string; student_code: string };

const actor = (req: Request) => ({ type: 'admin' as const, id: req.admin!.id });

function recordForAdmin(admin: AdminProfile, id: string): AttendanceDbRow {
  const row = one<AttendanceDbRow>('SELECT * FROM attendance WHERE id = ?', id);
  if (!row) throw notFound('El registro de asistencia no existe.');
  assertStudentAccess(admin, row.student_id);
  return row;
}

const joined = (id: string) =>
  toRow(
    one<JoinedRow>(
      'SELECT a.*, s.full_name AS student_name, s.code AS student_code FROM attendance a JOIN students s ON s.id = a.student_id WHERE a.id = ?',
      id,
    )!,
  );

const listQuery = z.object({
  from: z.string().regex(DATE_RE).optional(),
  to: z.string().regex(DATE_RE).optional(),
  studentId: z.string().optional(),
  status: z.enum(['all', 'open', 'valid', 'rejected', 'late']).default('all'),
});

attendanceRouter.get('/', (req, res) => {
  const query = parse(listQuery, req.query);
  const scope = studentScope(req.admin!);
  const where = [scope.sql];
  const params: Param[] = [...scope.params];

  if (query.from) {
    where.push('a.check_in >= ?');
    params.push(dayBounds(query.from).start);
  }
  if (query.to) {
    where.push('a.check_in <= ?');
    params.push(dayBounds(query.to).end);
  }
  if (query.studentId) {
    where.push('a.student_id = ?');
    params.push(query.studentId);
  }
  if (query.status === 'open') where.push('a.check_out IS NULL');
  if (query.status === 'valid') where.push("a.status = 'valid' AND a.check_out IS NOT NULL");
  if (query.status === 'rejected') where.push("a.status = 'rejected'");
  if (query.status === 'late') where.push('a.late_minutes > 0');

  const rows = many<JoinedRow>(
    `SELECT a.*, s.full_name AS student_name, s.code AS student_code
       FROM attendance a JOIN students s ON s.id = a.student_id
      WHERE ${where.join(' AND ')}
      ORDER BY a.check_in DESC
      LIMIT 3000`,
    ...params,
  );
  res.json(rows.map(toRow));
});

/** Captura manual (correcciones u olvidos), queda marcada como "manual" */
attendanceRouter.post('/', (req, res) => {
  const data = parse(manualRecordSchema, req.body);
  assertStudentAccess(req.admin!, data.studentId);
  const id = randomUUID();
  run(
    "INSERT INTO attendance (id, student_id, check_in, check_out, notes, source, reviewed_by) VALUES (?, ?, ?, ?, ?, 'manual', ?)",
    id,
    data.studentId,
    data.checkIn,
    data.checkOut,
    data.notes,
    req.admin!.id,
  );
  refreshProgress(data.studentId);
  audit(actor(req), 'create_manual', 'attendance', id, { studentId: data.studentId });
  res.status(201).json(joined(id));
});

attendanceRouter.put('/:id', (req, res) => {
  const row = recordForAdmin(req.admin!, req.params.id);
  const data = parse(recordSchema, req.body);
  run(
    'UPDATE attendance SET check_in = ?, check_out = ?, notes = ?, reviewed_by = ?, updated_at = ? WHERE id = ?',
    data.checkIn,
    data.checkOut,
    data.notes,
    req.admin!.id,
    nowIso(),
    row.id,
  );
  if (data.checkOut) markMissingCheckoutResolved(row.id);
  refreshProgress(row.student_id);
  audit(actor(req), 'update', 'attendance', row.id, {
    before: { checkIn: row.check_in, checkOut: row.check_out },
    after: { checkIn: data.checkIn, checkOut: data.checkOut },
  });
  res.json(joined(row.id));
});

/** Validar o invalidar un registro tras revisar su evidencia */
attendanceRouter.patch('/:id/review', (req, res) => {
  const row = recordForAdmin(req.admin!, req.params.id);
  const data = parse(reviewSchema, req.body);
  run(
    'UPDATE attendance SET status = ?, review_note = ?, reviewed_by = ?, updated_at = ? WHERE id = ?',
    data.status,
    data.note,
    req.admin!.id,
    nowIso(),
    row.id,
  );
  refreshProgress(row.student_id);
  audit(actor(req), data.status === 'valid' ? 'validate' : 'reject', 'attendance', row.id, { note: data.note });
  res.json(joined(row.id));
});

attendanceRouter.delete('/:id', (req, res) => {
  if (req.admin!.role !== 'superadmin') throw forbidden('Solo el administrador general puede eliminar registros. Puedes invalidarlo.');
  const row = recordForAdmin(req.admin!, req.params.id);
  run('DELETE FROM attendance WHERE id = ?', row.id);
  removeEvidence(row.check_in_photo, row.check_out_photo);
  refreshProgress(row.student_id);
  audit(actor(req), 'delete', 'attendance', row.id, { studentId: row.student_id, checkIn: row.check_in });
  res.status(204).end();
});

attendanceRouter.get('/:id/evidence/:kind', (req, res) => {
  const kind = parse(z.enum(['in', 'out']), req.params.kind);
  const row = recordForAdmin(req.admin!, req.params.id);
  res.set('Cache-Control', 'private, max-age=86400');
  res.sendFile(evidencePath(kind === 'in' ? row.check_in_photo : row.check_out_photo));
});
