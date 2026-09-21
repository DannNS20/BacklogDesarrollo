import { existsSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', '..');
const envFile = path.join(root, '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

// Todas las fechas "del día" se calculan con la hora de Guadalajara
process.env.TZ ||= 'America/Mexico_City';

const env = process.env;
const production = process.argv.includes('--production') || env.NODE_ENV === 'production';
// En desarrollo se usa API_PORT: herramientas como Vite o el preview inyectan PORT para el frontend.
// En producción se respeta PORT, que es lo que asignan la mayoría de los servidores.
const port = Number((production ? env.PORT : undefined) ?? env.API_PORT ?? 4590);
const appOrigin = (env.APP_ORIGIN ?? (production ? `http://localhost:${port}` : 'http://localhost:5190')).replace(/\/$/, '');

export const config = {
  root,
  port,
  production,
  /** URL pública desde la que se usa la plataforma (necesaria para biometría y correos) */
  appOrigin,
  allowedOrigins: [...new Set([appOrigin, `http://localhost:${port}`])],
  rpID: new URL(appOrigin).hostname,
  dataDir: path.resolve(root, env.DATA_DIR ?? 'server/data'),
  distDir: path.join(root, 'dist'),
  /** Exigir verificación biométrica para registrar acceso desde el celular */
  requireBiometric: env.REQUIRE_BIOMETRIC !== 'false',
  /** Validar que la persona esté dentro de la geocerca del acceso */
  enforceGeofence: env.ENFORCE_GEOFENCE !== 'false',
  seedAdmin: {
    email: env.SEED_ADMIN_EMAIL?.trim().toLowerCase(),
    password: env.SEED_ADMIN_PASSWORD,
    name: env.SEED_ADMIN_NAME?.trim() || 'Administrador del sistema',
  },
  smtp: {
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT ?? 587),
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.SMTP_FROM ?? 'UniAccess CUTlaquepaque <no-reply@udg.mx>',
  },
};
