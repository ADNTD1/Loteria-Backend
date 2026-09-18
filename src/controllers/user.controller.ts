import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { generateToken } from "../utils/jwt.utils.js";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";

const prisma = new PrismaClient();

// Estructura en memoria para rastrear qué cuentas tienen sesión activa
const activeSessions = new Set<string>();

/**
 * @swagger
 * /api/users/login:
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

    // 2. Renovar sesión activa (sin bloquear con 403)
    activeSessions.add(cleanAccountNumber);

    // 3. Generar token y responder
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

/**
 * @swagger
 * /api/users/logout:
 *   post:
 *     summary: Cerrar sesión
 *     description: Libera la sesión activa del usuario.
 *     tags:
 *       - Autenticación
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               accountNumber:
 *                 type: string
 *                 example: "20230001"
 *     responses:
 *       200:
 *         description: Sesión cerrada correctamente
 */
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

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Obtener perfil del usuario actual
 *     description: Retorna la información del usuario autenticado a través del token JWT.
 *     tags:
 *       - Autenticación
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos del usuario autenticado
 *       401:
 *         description: Token no proporcionado o inválido
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno del servidor
 */
export const getMe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const accountNumber = req.user?.accountNumber;

    if (!accountNumber) {
      return res.status(401).json({
        ok: false,
        message: "No autenticado",
      });
    }

    const user = await prisma.user.findUnique({
      where: { accountNumber },
    });

    if (!user) {
      return res.status(404).json({
        ok: false,
        message: "Usuario no encontrado",
      });
    }

    return res.json({
      ok: true,
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Error interno al obtener el perfil",
    });
  }
};