/**
 * Error controlado de la API.
 *
 * Lánzalo desde cualquier controlador o servicio y el middleware global
 * responderá con este statusCode y este mensaje:
 *
 *   throw new AppError("La sala no existe", 404);
 *
 * Cualquier otro error (bugs, fallas de librerías) responde 500
 * con un mensaje genérico para no exponer detalles internos.
 */
export class AppError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}