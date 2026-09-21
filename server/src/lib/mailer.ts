import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import nodemailer from 'nodemailer';
import type { MailResult } from '../../../shared/contracts.ts';
import { config } from '../config.ts';

const { smtp } = config;

const transport = smtp.host
  ? nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
    })
  : null;

export const smtpConfigured = () => transport !== null;

/**
 * Envía un correo por SMTP. Si no hay SMTP configurado, lo guarda en
 * server/data/outbox para que no se pierda durante pruebas.
 */
export async function sendMail({ to, subject, text }: { to: string; subject: string; text: string }): Promise<MailResult> {
  if (transport) {
    await transport.sendMail({ from: smtp.from, to, subject, text });
    return { delivered: true, mode: 'smtp' };
  }

  const outbox = path.join(config.dataDir, 'outbox');
  mkdirSync(outbox, { recursive: true });
  const file = path.join(outbox, `${new Date().toISOString().replace(/[:.]/g, '-')}_${to.replace(/[^a-z0-9]/gi, '_')}.txt`);
  writeFileSync(file, `Para: ${to}\nAsunto: ${subject}\nFecha: ${new Date().toLocaleString('es-MX')}\n\n${text}\n`);
  return { delivered: false, mode: 'outbox' };
}
