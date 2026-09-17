import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { RoomStatus, type Room } from "../interfaces/room.interface.js";
import { generateRoomCode } from "../utils/generateRoomCode.js";
import { AliasesStore, validateAlias } from "../state/aliases.store.js";

const prisma = new PrismaClient();

// Temporal.
// getRoomByCode y joinRoom todavía utilizan este arreglo.
// Cuando implementemos RF-02/RF-03 los migraremos también a Prisma.
const activeRooms: Room[] = [];

/**
 * RF-01: Crear una sala.
 */
export const createRoom = async (req: Request, res: Response) => {
  try {
    const { hostAccountNumber } = req.body;

    // El usuario debe haberse identificado previamente.
    if (!hostAccountNumber) {
      return res.status(400).json({
        ok: false,
        message: "Favor de autenticarse antes de crear una sala"
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
          status: "WAITING"
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
 *
 * TEMPORAL: todavía utiliza activeRooms.
 * Se migrará a Prisma junto con RF-02/RF-03.
 */
export const getRoomByCode = (req: Request, res: Response) => {
  const { code } = req.params;

  const room = activeRooms.find(r => r.code === code);

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
};


/**
 * Unirse a una sala.
 *
 * TEMPORAL: todavía utiliza activeRooms.
 * Se migrará a Prisma en RF-02/RF-03.
 */
export const joinRoom = (req: Request, res: Response) => {
  const { code, accountNumber, alias } = req.body;

  if (!accountNumber || !code) {
    return res.status(400).json({
      ok: false,
      data: {
        message: "Debes haberte identificado antes de ingresar a una sala",
        code,
        cuenta: accountNumber
      }
    });
  }

  const room = activeRooms.find(r => r.code === code);

  if (!room) {
    return res.status(404).json({
      ok: false,
      data: {
        message: "La sala especificada no fue encontrada"
      }
    });
  }

  if (room.status !== RoomStatus.WAITING) {
    return res.status(400).json({
      ok: false,
      data: {
        message: "La partida de la sala ya comenzó"
      }
    });
  }

  // Validar y registrar el alias del jugador para esta sala.
  const aliasCheck = validateAlias(alias);

  if (!aliasCheck.ok) {
    return res.status(400).json({
      ok: false,
      data: { message: aliasCheck.error }
    });
  }

  if (AliasesStore.isTaken(code, accountNumber, aliasCheck.value)) {
    return res.status(409).json({
      ok: false,
      data: { message: `El alias "${aliasCheck.value}" ya está en uso en esta sala` }
    });
  }

  AliasesStore.set(code, accountNumber, aliasCheck.value);

  if (!room.players.includes(accountNumber)) {
    room.players.push(accountNumber);
  }

  return res.json({
    ok: true,
    message: "Te has unido exitosamente",
    data: {
      ...room,
      alias: aliasCheck.value,
      aliases: AliasesStore.getAllForRoom(code)
    }
  });
};