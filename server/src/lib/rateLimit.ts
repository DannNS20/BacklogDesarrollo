import { HttpError } from './http.ts';

export const MINUTE = 60 * 1000;

const buckets = new Map<string, { count: number; resetAt: number }>();

/** Limitador en memoria para frenar ataques de fuerza bruta */
export function hitRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count++;
  if (bucket.count > limit) {
    const minutes = Math.ceil((bucket.resetAt - now) / MINUTE);
    throw new HttpError(429, `Demasiados intentos. Espera ${minutes} min e inténtalo de nuevo.`);
  }
}

export const clearRateLimit = (key: string) => buckets.delete(key);

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) if (bucket.resetAt < now) buckets.delete(key);
}, 10 * MINUTE).unref();
