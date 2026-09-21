import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync, type SQLInputValue, type StatementSync } from 'node:sqlite';
import { config } from '../config.ts';
import { SCHEMA } from './schema.ts';

mkdirSync(config.dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(config.dataDir, 'servicio-social.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
db.exec(SCHEMA);

export type Param = SQLInputValue;

const statements = new Map<string, StatementSync>();
function statement(sql: string): StatementSync {
  let prepared = statements.get(sql);
  if (!prepared) {
    prepared = db.prepare(sql);
    statements.set(sql, prepared);
  }
  return prepared;
}

export const one = <T>(sql: string, ...params: Param[]) => statement(sql).get(...params) as unknown as T | undefined;
export const many = <T>(sql: string, ...params: Param[]) => statement(sql).all(...params) as unknown as T[];
export const run = (sql: string, ...params: Param[]) => statement(sql).run(...params);

/** Ejecuta varias escrituras de forma atómica */
export function transaction<T>(fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export const nowIso = () => new Date().toISOString();
export const bool = (value: boolean) => (value ? 1 : 0);
