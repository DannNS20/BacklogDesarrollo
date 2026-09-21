import { createHash, randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { config } from '../config.ts';
import { one, run } from '../db/index.ts';

export type SubjectType = 'staff' | 'person';

/** Cookies distintas: las sesiones de cada portal son completamente independientes */
export const SESSION_COOKIES: Record<SubjectType, string> = {
  staff: 'uniaccess_staff',
  person: 'uniaccess_person',
};

const HOUR = 60 * 60 * 1000;
const SESSION_TTL: Record<SubjectType, number> = {
  staff: 10 * HOUR,
  // El celular es el medio de acceso diario: sesión larga para no pedir contraseña en la entrada
  person: 30 * 24 * HOUR,
};

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index > 0 && part.slice(0, index).trim() === name) return decodeURIComponent(part.slice(index + 1).trim());
  }
  return null;
}

export function startSession(res: Response, type: SubjectType, subjectId: string, userAgent = '') {
  const token = randomBytes(32).toString('base64url');
  const ttl = SESSION_TTL[type];
  run(
    'INSERT INTO sessions (token_hash, subject_type, subject_id, expires_at, user_agent) VALUES (?, ?, ?, ?, ?)',
    hashToken(token),
    type,
    subjectId,
    new Date(Date.now() + ttl).toISOString(),
    userAgent.slice(0, 250),
  );
  res.cookie(SESSION_COOKIES[type], token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.appOrigin.startsWith('https://'),
    maxAge: ttl,
    path: '/api',
  });
}

export function resolveSession(type: SubjectType, token: string): string | null {
  const session = one<{ subject_id: string; expires_at: string }>(
    'SELECT subject_id, expires_at FROM sessions WHERE token_hash = ? AND subject_type = ?',
    hashToken(token),
    type,
  );
  if (!session) return null;
  if (session.expires_at < new Date().toISOString()) {
    run('DELETE FROM sessions WHERE token_hash = ?', hashToken(token));
    return null;
  }
  return session.subject_id;
}

export function endSession(req: Request, res: Response, type: SubjectType) {
  const token = readCookie(req, SESSION_COOKIES[type]);
  if (token) run('DELETE FROM sessions WHERE token_hash = ?', hashToken(token));
  res.clearCookie(SESSION_COOKIES[type], { path: '/api' });
}

/** Cierra todas las sesiones (al cambiar contraseña o dar de baja) */
export function revokeSessions(type: SubjectType, subjectId: string) {
  run('DELETE FROM sessions WHERE subject_type = ? AND subject_id = ?', type, subjectId);
}
