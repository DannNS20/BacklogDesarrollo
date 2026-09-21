import { randomUUID } from 'node:crypto';
import { config } from '../config.ts';
import { hashPassword } from '../lib/passwords.ts';
import { one, run } from './index.ts';
import { DEFAULT_ACCESS_POINTS } from './schema.ts';

/** Crea el primer administrador y los accesos de ejemplo si la base está vacía */
export async function seedInitialData() {
  const { count } = one<{ count: number }>('SELECT COUNT(*) AS count FROM staff')!;
  if (count === 0) {
    const { email, password, name } = config.seedAdmin;
    if (!email || !password) {
      console.warn('⚠  No hay operadores. Define SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD en .env y reinicia el servidor.');
    } else {
      run(
        'INSERT INTO staff (id, email, full_name, area, role, password_hash) VALUES (?, ?, ?, ?, ?, ?)',
        randomUUID(),
        email,
        name,
        'Coordinación de Seguridad y Accesos',
        'admin',
        await hashPassword(password),
      );
      console.log(`✔  Administrador creado: ${email}`);
    }
  }

  const points = one<{ count: number }>('SELECT COUNT(*) AS count FROM access_points')!;
  if (points.count === 0) {
    for (const point of DEFAULT_ACCESS_POINTS) {
      run(
        'INSERT INTO access_points (id, name, description, allowed_roles) VALUES (?, ?, ?, ?)',
        randomUUID(),
        point.name,
        point.description,
        JSON.stringify(point.roles),
      );
    }
    console.log(`✔  Accesos iniciales creados: ${DEFAULT_ACCESS_POINTS.map(p => p.name).join(', ')}`);
  }
}
