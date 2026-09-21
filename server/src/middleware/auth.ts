import type { RequestHandler } from 'express';
import type { AdminProfile } from '../../../shared/contracts.ts';
import { one } from '../db/index.ts';
import { forbidden, unauthorized } from '../lib/http.ts';
import { readCookie, resolveSession, SESSION_COOKIES } from '../lib/sessions.ts';
import { toAdminProfile, type AdminRow } from '../services/admins.ts';
import type { StudentRow } from '../services/students.ts';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: AdminProfile;
      student?: StudentRow;
    }
  }
}

export const requireAdmin: RequestHandler = (req, _res, next) => {
  const token = readCookie(req, SESSION_COOKIES.admin);
  const adminId = token ? resolveSession('admin', token) : null;
  const row = adminId ? one<AdminRow>('SELECT * FROM admins WHERE id = ? AND active = 1', adminId) : undefined;
  if (!row) throw unauthorized('Tu sesión expiró. Inicia sesión nuevamente.');
  req.admin = toAdminProfile(row);
  next();
};

export const requireSuperadmin: RequestHandler = (req, _res, next) => {
  if (req.admin?.role !== 'superadmin') throw forbidden('Solo el administrador general puede realizar esta acción.');
  next();
};

export const requireStudent: RequestHandler = (req, _res, next) => {
  const token = readCookie(req, SESSION_COOKIES.student);
  const studentId = token ? resolveSession('student', token) : null;
  const row = studentId ? one<StudentRow>('SELECT * FROM students WHERE id = ? AND active = 1', studentId) : undefined;
  if (!row) throw unauthorized('Tu sesión expiró. Inicia sesión nuevamente.');
  req.student = row;
  next();
};
