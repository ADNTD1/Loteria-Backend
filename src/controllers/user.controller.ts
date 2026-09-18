import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { generateToken } from "../utils/jwt.utils.js";

const prisma = new PrismaClient();

// Estructura en memoria para rastrear qué cuentas tienen sesión activa
const activeSessions = new Set<string>();

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Iniciar sesión con número de cuenta
 *     description: Permite a un usuario iniciar sesión utilizando su número de cuenta registrado.
 *     tags:
 *       - Autenticación
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accountNumber
 *             properties:
 *               accountNumber:
 *                 type: string
 *                 example: "20230001"
 *                 description: Número de cuenta del usuario
 *     responses:
 *       200:
 *         description: Acceso correcto
 *       400:
 *         description: El número de cuenta es obligatorio
 *       403:
 *         description: Ya existe una sesión activa con este número de cuenta
 *       404:
 *         description: Número de cuenta no registrado
 *       500:
 *         description: Error interno del servidor
 */

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
    // 1. Buscar si el usuario existe en la base de datos
    const user = await prisma.user.findUnique({
      where: { accountNumber: cleanAccountNumber },
    });
    if (!user) {
      return res.status(404).json({
        ok: false,
        message: "Número de cuenta no registrado en el sistema",
      });
    }
    // 2. Si ya tenía sesión previa (por ejemplo, cerró la pestaña o recargó F5),
    // simplemente la renovamos en lugar de bloquearlo con error 403
    activeSessions.add(cleanAccountNumber);
    // 3. Generar nuevo token y responder
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
// Ejemplo de uso:
// 1) Haders: Content-Type y Application-Json Raw
// 2) Json:
//   {
//      accountNumber: "20000555"
//   }
// 3: Mehod: POST
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
