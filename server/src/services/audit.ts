import { randomUUID } from 'node:crypto';
import { run } from '../db/index.ts';

export interface Actor {
  type: 'admin' | 'student';
  id: string;
}

/** Bitácora de acciones sensibles (altas, contraseñas, correcciones) */
export function audit(actor: Actor, action: string, entity: string, entityId: string | null, details: Record<string, unknown> = {}) {
  run(
    'INSERT INTO audit_log (id, actor_type, actor_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?, ?, ?)',
    randomUUID(),
    actor.type,
    actor.id,
    action,
    entity,
    entityId,
    JSON.stringify(details),
  );
}
