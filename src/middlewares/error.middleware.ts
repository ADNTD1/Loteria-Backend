import type { ErrorRequestHandler, RequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { AppError } from "../errors/app.error.js";

interface ErrorResponse {
  statusCode: number;
  message: string;
}

// Errores que lanza express.json() (body-parser) cuando no puede leer el body.
interface HttpError extends Error {
  status: number;
  type?: string;
}

const bodyParserMessages: Record<string, string> = {
  "entity.parse.failed": "El cuerpo de la petición no es un JSON válido",
  "entity.too.large": "El cuerpo de la petición es demasiado grande"
};

// Errores de Prisma causados por los datos que mandó el cliente.
// https://www.prisma.io/docs/orm/reference/error-reference
const prismaErrors: Record<string, ErrorResponse> = {
  P2002: { statusCode: 409, message: "El registro ya existe" },
  P2003: { statusCode: 400, message: "El registro relacionado no existe" },
  P2025: { statusCode: 404, message: "El registro no fue encontrado" }
};

const isHttpError = (err: unknown): err is HttpError =>
  err instanceof Error && typeof (err as Partial<HttpError>).status === "number";

const resolveError = (err: unknown): ErrorResponse => {
  if (err instanceof AppError) {
    return { statusCode: err.statusCode, message: err.message };
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const prismaError = prismaErrors[err.code];
    if (prismaError) return prismaError;
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    return { statusCode: 503, message: "No se pudo conectar con la base de datos" };
  }

  if (isHttpError(err) && err.status >= 400 && err.status < 500) {
    return {
      statusCode: err.status,
      message: bodyParserMessages[err.type ?? ""] ?? "Petición inválida"
    };
  }

  return { statusCode: 500, message: "Error interno del servidor" };
};

/**
 * Responde 404 a cualquier ruta que no exista.
 * Debe registrarse después de todas las rutas.
 */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(`Ruta ${req.method} ${req.originalUrl} no encontrada`, 404));
};

/**
 * Manejo global de errores. Debe ser el último app.use().
 *
 * En Express 5 los errores lanzados dentro de controladores async llegan
 * aquí automáticamente, así que no hace falta try/catch en cada uno.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  // Si la respuesta ya se empezó a enviar, solo Express puede cerrarla.
  if (res.headersSent) {
    return next(err);
  }

  const { statusCode, message } = resolveError(err);

  // El detalle completo solo va a la consola, nunca al cliente.
  if (statusCode >= 500) {
    console.error(`[${req.method} ${req.originalUrl}]`, err);
  }

  res.status(statusCode).json({
    ok: false,
    message
  });
};