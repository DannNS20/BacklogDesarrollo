import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/server';
import { Router } from 'express';
import { z } from 'zod';
import type { StudentOverview, StudentSession } from '../../../shared/contracts.ts';
import { estimateCompletion } from '../../../shared/rules.ts';
import { config } from '../config.ts';
import { many, one, run } from '../db/index.ts';
import { addDays, todayBounds } from '../lib/dates.ts';
import { evidencePath } from '../lib/evidence.ts';
import { notFound, parse } from '../lib/http.ts';
import { checkSchema } from '../schemas.ts';
import { openRecordToday, registerCheck, toRecord, type AttendanceDbRow } from '../services/attendance.ts';
import { audit } from '../services/audit.ts';
import { findSummaryRow, getSchedule, minutesSql } from '../services/students.ts';
import { authenticationOptions, completeRegistration, listCredentials, registrationOptions } from '../services/webauthn.ts';

export const studentRouter = Router();

studentRouter.get('/session', (req, res) => {
  const student = req.student!;
  const session: StudentSession = { id: student.id, code: student.code, fullName: student.full_name, email: student.email };
  res.json(session);
});

studentRouter.get('/overview', (req, res) => {
  const student = req.student!;
  const summary = findSummaryRow(student.id)!;
  const schedule = getSchedule(student.id);
  const { start, end } = todayBounds();
  const open = openRecordToday(student.id);

  const stats = one<{ today: number | null; late: number; devices: number }>(
    `SELECT (SELECT SUM(${minutesSql('a')}) FROM attendance a
              WHERE a.student_id = ? AND a.status = 'valid' AND a.check_out IS NOT NULL AND a.check_in BETWEEN ? AND ?) AS today,
            (SELECT COUNT(*) FROM attendance WHERE student_id = ? AND late_minutes > 0) AS late,
            (SELECT COUNT(*) FROM webauthn_credentials WHERE student_id = ?) AS devices`,
    student.id,
    start,
    end,
    student.id,
    student.id,
  )!;

  const now = new Date();
  const todayMinutes = stats.today ?? 0;
  const remaining = summary.required_hours * 60 - summary.valid_minutes;
  const attendedToday = todayMinutes > 0 || !!open;

  const overview: StudentOverview = {
    profile: {
      id: summary.id,
      code: summary.code,
      fullName: summary.full_name,
      email: summary.email,
      career: summary.career,
      program: summary.program,
      requiredHours: summary.required_hours,
      startDate: summary.start_date,
      supervisorName: summary.supervisor_name,
      supervisorEmail: summary.supervisor_email,
    },
    schedule,
    validMinutes: summary.valid_minutes,
    sessions: summary.sessions,
    lateCount: stats.late,
    todayMinutes,
    openRecord: open ? toRecord(open) : null,
    todaySlot: schedule.find(slot => slot.weekday === now.getDay()) ?? null,
    // Si hoy aún no asiste, la proyección cuenta el día de hoy
    estimatedCompletionDate: estimateCompletion(remaining, schedule, attendedToday ? now : addDays(now, -1)),
    biometricDevices: stats.devices,
    recent: many<AttendanceDbRow>('SELECT * FROM attendance WHERE student_id = ? ORDER BY check_in DESC LIMIT 5', student.id).map(toRecord),
    completedAt: summary.completed_at,
    lateToleranceMinutes: config.lateToleranceMinutes,
  };
  res.json(overview);
});

studentRouter.get('/attendance', (req, res) => {
  const rows = many<AttendanceDbRow>('SELECT * FROM attendance WHERE student_id = ? ORDER BY check_in DESC LIMIT 1000', req.student!.id);
  res.json(rows.map(toRecord));
});

studentRouter.post('/attendance', async (req, res) => {
  const data = parse(checkSchema, req.body);
  const result = await registerCheck(req.student!, {
    photo: data.photo,
    geo: data.geo,
    biometric: data.biometric as unknown as AuthenticationResponseJSON | null,
  });
  res.status(201).json(result);
});

const evidenceKind = z.enum(['in', 'out']);

studentRouter.get('/attendance/:id/evidence/:kind', (req, res) => {
  const kind = parse(evidenceKind, req.params.kind);
  const row = one<AttendanceDbRow>('SELECT * FROM attendance WHERE id = ? AND student_id = ?', req.params.id, req.student!.id);
  if (!row) throw notFound('El registro no existe.');
  res.set('Cache-Control', 'private, max-age=86400');
  res.sendFile(evidencePath(kind === 'in' ? row.check_in_photo : row.check_out_photo));
});

/* ---------- Biometría (WebAuthn / passkeys del dispositivo) ---------- */

studentRouter.get('/biometrics', (req, res) => {
  res.json(listCredentials(req.student!.id));
});

studentRouter.post('/biometrics/register-options', async (req, res) => {
  res.json(await registrationOptions(req.student!));
});

const registerSchema = z.object({
  response: z.record(z.string(), z.unknown()),
  label: z.string().trim().max(60).default(''),
});

studentRouter.post('/biometrics', async (req, res) => {
  const data = parse(registerSchema, req.body);
  const studentId = req.student!.id;
  await completeRegistration(studentId, data.response as unknown as RegistrationResponseJSON, data.label);
  audit({ type: 'student', id: studentId }, 'register_biometric', 'student', studentId, { label: data.label });
  res.status(201).json(listCredentials(studentId));
});

studentRouter.delete('/biometrics/:id', (req, res) => {
  const studentId = req.student!.id;
  run('DELETE FROM webauthn_credentials WHERE id = ? AND student_id = ?', req.params.id, studentId);
  audit({ type: 'student', id: studentId }, 'remove_biometric', 'student', studentId);
  res.json(listCredentials(studentId));
});

studentRouter.post('/biometrics/auth-options', async (req, res) => {
  res.json(await authenticationOptions(req.student!.id));
});
