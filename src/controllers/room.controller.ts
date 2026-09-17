import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { generateRoomCode } from "../utils/generateRoomCode.js";

const prisma = new PrismaClient();

/**
 * RF-01: Crear una sala.
 */
export const createRoom = async (req: Request, res: Response) => {
  try {
    const { hostAccountNumber, maxPlayers } = req.body;

    // El usuario debe haberse identificado previamente.
    if (!hostAccountNumber) {
      return res.status(400).json({
        ok: false,
        message: "El número de cuenta es requerido"
      });
    }

    if (!Number.isInteger(maxPlayers) || maxPlayers < 2) {
      return res.status(400).json({
        ok: false,
        message: "La sala debe permitir al menos 2 jugadores"
      });
    }

    // Verificar que el usuario exista.
    const hostUser = await prisma.user.findUnique({
      where: {
        accountNumber: hostAccountNumber
      }
    });

    if (!hostUser) {
      return res.status(404).json({
        ok: false,
        message: "El usuario no existe"
      });
    }

    // Generar un código que no esté siendo utilizado.
    let code: string;

    do {
      code = generateRoomCode();
    } while (
      await prisma.room.findUnique({
        where: { code }
      })
    );

    // Crear la sala y registrar al host como miembro de ella
    // dentro de una misma transacción.
    const newRoom = await prisma.$transaction(async (tx) => {
      const room = await tx.room.create({
        data: {
          hostAccountNumber,
          code,
          status: "WAITING",
          maxPlayers
        }
      });

      await tx.roomPlayer.create({
        data: {
          roomId: room.id,
          userId: hostUser.id
        }
      });

      return room;
    });

    return res.status(201).json({
      ok: true,
      data: {
        message: newRoom
      }
    });

  } catch (error) {
    console.error("Error al crear la sala:", error);

    return res.status(500).json({
      ok: false,
      message: "Error al crear la sala"
    });
  }
};


/**
 * Obtener una sala por código.
 */

export const getRoomByCode = async (req: Request, res: Response) => {
  try {
    const code = req.params.code as string;

    if (typeof code !== "string") {
      return res.status(400).json({
        ok: false,
        message: "Código de sala inválido"
      });
    }

    const room = await prisma.room.findUnique({
      where: {
        code
      },
      include: { // incluir jugadores en la sala
        players: true
      }
    });

    if (!room) {
      return res.status(404).json({
        ok: false,
        data: {
          message: `Sala con código: ${code} no encontrada`
        }
      });
    }

    return res.json({
      ok: true,
      data: room
    });

  } catch (error) {
    console.error("Error al obtener la sala:", error);

    return res.status(500).json({
      ok: false,
      message: "Error al obtener la sala"
    });
  }
};


/**
 * RF-02: Unirse a una sala mediante su código.
 */
export const joinRoom = async (req: Request, res: Response) => {
  try {
    const { code, accountNumber } = req.body;

    // 1. Validar parámetros requeridos
    if (!code || !accountNumber) {
      return res.status(400).json({
        ok: false,
        message: "El código de sala y número de cuenta son requeridos"
      });
    }

    // 2. Comprobar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { accountNumber }
    });  

    if (!user) {
      return res.status(404).json({
        ok: false,
        message: "El usuario no existe"
      });
    }

    // 3. Comprobar que la sala existe (incluyendo el conteo de jugadores)
    const room = await prisma.room.findUnique({
      where: { code },
      include: {
        _count: {
          select: { players: true }
        }
      }
    });

    if (!room) {
      return res.status(404).json({
        ok: false,
        data: { message: "La sala especificada no fue encontrada" }
      });
    }

    // 4. Comprobar que la sala este en estado WAITING
    if (room.status !== "WAITING") { 
      return res.status(400).json({
        ok: false,
        data: { message: "La partida de la sala ya comenzó" }
      });
    }

    // 5. Comprobar si el usuario ya pertenece a la sala PRIMERO
    const existingPlayer = await prisma.roomPlayer.findFirst({
      where: {
        roomId: room.id,
        userId: user.id
      }
    });

    if (existingPlayer) {
      return res.status(200).json({
        ok: true,
        message: "El jugador ya pertenece a esta sala",
        data: room
      });
    }

    // 6. Si NO pertenece, comprobar si se alcanzó la capacidad máxima
    if (room._count.players >= room.maxPlayers) {
      return res.status(400).json({
        ok: false,
        data: { message: "La sala está llena" }
      });
    }

    // 7. Si hay espacio, crear la relación
    await prisma.roomPlayer.create({
      data: {
        roomId: room.id,
        userId: user.id
      }
    });

    return res.json({
      ok: true,
      message: "Te has unido exitosamente",
      data: room
    });
  } catch (error) {
    console.error("Error al unirse a la sala:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al unirse a la sala"
    });
  }
};
