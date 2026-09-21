import { z } from 'zod';
import { DATE_RE, INSTITUTIONAL_EMAIL_RE, TIME_RE, toMinutes } from '../../shared/rules.ts';

const institutionalEmail = (message: string) => z.string().trim().toLowerCase().regex(INSTITUTIONAL_EMAIL_RE, message);

const text = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres.`);

export const scheduleSchema = z
  .array(
    z.object({
      weekday: z.number().int().min(0).max(6),
      start: z.string().regex(TIME_RE, 'Hora de entrada inválida.'),
      end: z.string().regex(TIME_RE, 'Hora de salida inválida.'),
    }),
  )
  .min(1, 'Asigna al menos un día en el horario.')
  .max(7)
  .refine(slots => new Set(slots.map(s => s.weekday)).size === slots.length, 'Hay días repetidos en el horario.')
  .refine(slots => slots.every(s => toMinutes(s.end) > toMinutes(s.start)), 'En el horario, la salida debe ser posterior a la entrada.');

export const studentSchema = z.object({
  code: z.string().trim().regex(/^\d{7,10}$/, 'El código de estudiante debe tener entre 7 y 10 dígitos.'),
  fullName: z
    .string()
    .trim()
    .min(5, 'Escribe el nombre completo.')
    .max(120)
    .transform(value => value.replace(/\s+/g, ' ')),
  email: institutionalEmail('Usa el correo institucional del estudiante (por ejemplo, @alumnos.udg.mx).'),
  career: z.string().trim().min(3, 'Indica la carrera.').max(120),
  program: text(120),
  requiredHours: z.number().int('Las horas requeridas deben ser un número entero.').min(1).max(2000),
  startDate: z.string().regex(DATE_RE, 'La fecha de inicio no es válida.').nullable(),
  supervisorId: z.string().min(1).nullable(),
  schedule: scheduleSchema,
});

export const adminSchema = z.object({
  email: institutionalEmail('Usa un correo institucional de la UdeG.'),
  fullName: z.string().trim().min(5, 'Escribe el nombre completo.').max(120),
  area: text(120),
  role: z.enum(['superadmin', 'responsable']),
});

const isoDateTime = z
  .string()
  .refine(value => !Number.isNaN(Date.parse(value)), 'La fecha y hora no son válidas.')
  .transform(value => new Date(value).toISOString());

const recordFields = {
  checkIn: isoDateTime,
  checkOut: isoDateTime.nullable(),
  notes: text(500),
};

const recordRules = <T extends { checkIn: string; checkOut: string | null }>(schema: z.ZodType<T>) =>
  schema
    .refine(r => !r.checkOut || r.checkOut > r.checkIn, 'La salida debe ser posterior a la entrada.')
    .refine(r => Date.parse(r.checkIn) <= Date.now() + 5 * 60 * 1000, 'La entrada no puede estar en el futuro.');

export const recordSchema = recordRules(z.object(recordFields));
export const manualRecordSchema = recordRules(z.object({ ...recordFields, studentId: z.string().min(1, 'Selecciona un estudiante.') }));

export const reviewSchema = z.object({
  status: z.enum(['valid', 'rejected']),
  note: text(500),
});

export const emailSchema = z.object({
  subject: z.string().trim().min(3, 'Escribe el asunto.').max(200),
  body: z.string().trim().min(10, 'Escribe el mensaje.').max(5000),
});

export const checkSchema = z.object({
  photo: z.string().min(100, 'Toma una fotografía de evidencia.'),
  geo: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      accuracy: z.number().min(0).max(100000),
    })
    .nullable(),
  biometric: z.record(z.string(), z.unknown()).nullable(),
});
