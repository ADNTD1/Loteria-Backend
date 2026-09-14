import type { Request, Response, NextFunction } from "express";
import { verifyToken, type TokenPayload } from "../utils/jwt.utils.js";
import { AppError } from "../errors/app.error.js";

// Extendemos la petición de Express para almacenar el usuario autenticado
export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  // 1. Extraer el encabezado Authorization
  const authHeader = req.headers["authorization"];

  // El formato esperado es: "Bearer <token>"
  const token = authHeader && authHeader.split(" ")[1];

  // 2. Si no viene el token, se rechaza
  if (!token) {
    throw new AppError("Acceso denegado: no se proporcionó un token de autenticación", 401);
  }

  try {
    // 3. Validar el token con la función que ya tienes en jwt.utils.ts
    const payload = verifyToken(token);

    // 4. Guardar los datos del usuario en la petición (req.user)
    req.user = payload;

    // 5. Continuar a la siguiente función/controlador
    next();
  } catch (error) {
    throw new AppError("Token inválido o expirado", 401);
  }
};