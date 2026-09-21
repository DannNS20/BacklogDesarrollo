import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { z } from 'zod';

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (message: string) => new HttpError(400, message);
export const unauthorized = (message = 'Inicia sesión para continuar.') => new HttpError(401, message);
export const forbidden = (message = 'No tienes permiso para realizar esta acción.') => new HttpError(403, message);
export const notFound = (message = 'El recurso solicitado no existe.') => new HttpError(404, message);
export const conflict = (message: string) => new HttpError(409, message);

export function parse<S extends z.ZodType>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (!result.success) throw badRequest(result.error.issues[0]?.message ?? 'Los datos enviados no son válidos.');
  return result.data;
}

/** Protección CSRF adicional: las escrituras solo aceptan JSON */
export const requireJsonBody: RequestHandler = (req, _res, next) => {
  const hasBody = Number(req.headers['content-length'] ?? 0) > 0 || req.headers['transfer-encoding'] !== undefined;
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && hasBody && !req.is('application/json')) {
    throw new HttpError(415, 'Formato de solicitud no admitido.');
  }
  next();
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  if (error?.type === 'entity.too.large') {
    res.status(413).json({ error: 'La información enviada es demasiado grande.' });
    return;
  }
  if (error?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'La solicitud tiene un formato inválido.' });
    return;
  }
  console.error(error);
  res.status(500).json({ error: 'Ocurrió un error interno. Intenta de nuevo en unos momentos.' });
};
