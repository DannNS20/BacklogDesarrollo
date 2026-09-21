import { randomUUID } from 'node:crypto';
import { config } from '../config.ts';
import { hashPassword } from '../lib/passwords.ts';
import { one, run } from './index.ts';

/** Crea el primer administrador general si la tabla está vacía */
export async function seedFirstAdmin() {
  const { count } = one<{ count: number }>('SELECT COUNT(*) AS count FROM admins')!;
  if (count > 0) return;

  const { email, password, name } = config.seedAdmin;
  if (!email || !password) {
    console.warn('⚠  No hay administradores. Define SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD en .env y reinicia el servidor.');
    return;
  }

  run(
    'INSERT INTO admins (id, email, full_name, area, role, password_hash) VALUES (?, ?, ?, ?, ?, ?)',
    randomUUID(),
    email,
    name,
    'Coordinación de Servicio Social',
    'superadmin',
    await hashPassword(password),
  );
  console.log(`✔  Administrador general creado: ${email}`);
}
