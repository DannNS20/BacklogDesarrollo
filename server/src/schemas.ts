import { z } from 'zod';
import { CODE_RE, DATE_RE, INSTITUTIONAL_EMAIL_RE, PERSON_ROLES, STAFF_ROLES } from '../../shared/rules.ts';

const institutionalEmail = (message: string) => z.string().trim().toLowerCase().regex(INSTITUTIONAL_EMAIL_RE, message);
const text = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres.`);

export const personSchema = z.object({
  code: z.string().trim().regex(CODE_RE, 'El código o matrícula debe tener entre 6 y 10 dígitos.'),
  fullName: z
    .string()
    .trim()
    .min(5, 'Escribe el nombre completo.')
    .max(120)
    .transform(value => value.replace(/\s+/g, ' ')),
  email: institutionalEmail('Usa el correo institucional (por ejemplo, @alumnos.udg.mx o @udg.mx).'),
  role: z.enum(PERSON_ROLES as [string, ...string[]], { error: 'Selecciona el rol de la persona.' }),
  program: text(120),
  credentialExpiresAt: z.string().regex(DATE_RE, 'La vigencia de la credencial no es válida.').nullable(),
});

export const staffSchema = z.object({
  email: institutionalEmail('Usa un correo institucional de la UdeG.'),
  fullName: z.string().trim().min(5, 'Escribe el nombre completo.').max(120),
  area: text(120),
  role: z.enum(STAFF_ROLES as [string, ...string[]], { error: 'Selecciona el rol del operador.' }),
});

export const accessPointSchema = z.object({
  name: z.string().trim().min(3, 'Escribe el nombre del acceso.').max(80),
  description: text(200),
  allowedRoles: z
    .array(z.enum(PERSON_ROLES as [string, ...string[]]))
    .min(1, 'Selecciona al menos un rol permitido.')
    .transform(roles => [...new Set(roles)]),
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
  radiusMeters: z.number().int().min(20, 'El radio mínimo es de 20 metros.').max(5000),
  active: z.boolean(),
});

const geoSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100000),
});

export const checkSchema = z.object({
  direction: z.enum(['in', 'out']),
  accessPointId: z.string().min(1, 'Selecciona el acceso por el que ingresas.'),
  geo: geoSchema.nullable(),
  biometric: z.record(z.string(), z.unknown()).nullable(),
});

export const guestPassSchema = z.object({
  fullName: z.string().trim().min(5, 'Escribe el nombre del visitante.').max(120),
  document: text(60),
  reason: z.string().trim().min(3, 'Indica el motivo de la visita.').max(200),
  hostName: text(120),
  accessPointId: z.string().min(1, 'Selecciona el acceso.'),
});

export const manualRecordSchema = z.object({
  personId: z.string().min(1, 'Selecciona a la persona.'),
  accessPointId: z.string().min(1, 'Selecciona el acceso.'),
  direction: z.enum(['in', 'out']),
  notes: z.string().trim().min(5, 'Describe el motivo del registro manual.').max(500),
});

export const emailSchema = z.object({
  subject: z.string().trim().min(3, 'Escribe el asunto.').max(200),
  body: z.string().trim().min(10, 'Escribe el mensaje.').max(5000),
});
