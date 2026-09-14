import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { generateToken } from "../utils/jwt.utils.js";

const prisma = new PrismaClient();

// Estructura en memoria para rastrear qué cuentas tienen sesión activa
const activeSessions = new Set<string>();

export const loginWithAccountNumber = async (req: Request, res: Response) => {
  try {
    const { accountNumber } = req.body;

    if (!accountNumber) {
      return res.status(400).json({
        ok: false,
        message: "El número de cuenta es obligatorio",
      });
    }

    const cleanAccountNumber = String(accountNumber).trim();

    // 1. REGLA: Verificar si ya hay una sesión abierta con esta cuenta
    if (activeSessions.has(cleanAccountNumber)) {
      return res.status(403).json({
        ok: false,
        message: "Ya hay una sesión activa con este número de cuenta",
      });
    }

    // 2. Buscar si el usuario existe en la base de datos
    const user = await prisma.user.findUnique({
      where: { accountNumber: cleanAccountNumber },
    });

    if (!user) {
      return res.status(404).json({
        ok: false,
        message: "Número de cuenta no registrado en el sistema",
      });
    }

    // 3. Registrar la cuenta como sesión activa
    activeSessions.add(cleanAccountNumber);

    // 4. Generar token y responder
    const token = generateToken(user.accountNumber);

    return res.json({
      ok: true,
      message: "Acceso correcto",
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    console.error("Error al autenticar usuario:", error);
    return res.status(500).json({
      ok: false,
      message: "Error interno del servidor",
    });
  }
};

// Endpoint para liberar la sesión cuando el usuario sale
export const logoutUser = (req: Request, res: Response) => {
  const { accountNumber } = req.body;

  if (accountNumber) {
    activeSessions.delete(String(accountNumber).trim());
  }

  return res.json({
    ok: true,
    message: "Sesión cerrada correctamente",
  });
};