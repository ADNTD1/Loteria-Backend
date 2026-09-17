import type { Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { AppError } from "../errors/app.error.js";
import type { AuthenticatedRequest } from "./auth.middleware.js";

const prisma = new PrismaClient();

export const verifyRoomHost = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  const code = req.params.code;

  if (!code) {
    throw new AppError("Falta el código de sala", 400);
  }

  if (!req.user) {
    throw new AppError("Usuario no autenticado", 401);
  }

  const room = await prisma.room.findUnique({
    where: {
      code
    }
  });

  if (!room) {
    throw new AppError("La sala no existe", 404);
  }

  if (room.hostAccountNumber !== req.user.accountNumber) {
    throw new AppError(
      "Sólo el host puede realizar esta acción",
      403
    );
  }

  next();
};
