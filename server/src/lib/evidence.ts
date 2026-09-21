import { randomUUID } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { config } from '../config.ts';
import { badRequest, notFound } from './http.ts';

const EVIDENCE_DIR = path.join(config.dataDir, 'evidence');
const DATA_URL_RE = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/;
const MAX_BYTES = 2.5 * 1024 * 1024;

function hasImageSignature(buffer: Buffer, type: string): boolean {
  if (type === 'jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (type === 'png') return buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  return buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP';
}

/** Guarda la fotografía de evidencia y devuelve su ruta relativa */
export function saveEvidence(dataUrl: string): string {
  const match = DATA_URL_RE.exec(dataUrl);
  if (!match) throw badRequest('La fotografía de evidencia no es válida.');
  const [, type, base64] = match;
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length < 1024) throw badRequest('La fotografía de evidencia está vacía.');
  if (buffer.length > MAX_BYTES) throw badRequest('La fotografía debe pesar menos de 2.5 MB.');
  if (!hasImageSignature(buffer, type)) throw badRequest('El archivo enviado no es una imagen válida.');

  const now = new Date();
  const relative = path.posix.join(
    String(now.getFullYear()),
    String(now.getMonth() + 1).padStart(2, '0'),
    `${randomUUID()}.${type === 'jpeg' ? 'jpg' : type}`,
  );
  const absolute = path.join(EVIDENCE_DIR, relative);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, buffer);
  return relative;
}

export function evidencePath(relative: string | null): string {
  if (!relative) throw notFound('Este registro no tiene fotografía de evidencia.');
  const absolute = path.resolve(EVIDENCE_DIR, relative);
  if (!absolute.startsWith(EVIDENCE_DIR + path.sep)) throw notFound();
  return absolute;
}

export function removeEvidence(...files: Array<string | null>) {
  for (const file of files) if (file) rmSync(evidencePath(file), { force: true });
}
