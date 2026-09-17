import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { generateRoomCode } from "../utils/generateRoomCode.js";
import { AliasesStore, validateAlias } from "../state/aliases.store.js";

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


// Ejemplo de uso:
// Se manda un GET con el código de la sala en la URL.
// El código debe ser de tipo string.
//
// Ejemplo:
// GET /rooms/ABC-123
//
// No es necesario enviar un JSON en el body.
//
// Si la sala existe, se regresa:
// - La información de la sala.
// - La lista de jugadores que pertenecen a ella.
//
// Si el código no corresponde a ninguna sala, se regresa un error 404.

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
 * Permite que un usuario se una a una sala mediante el código de la sala
 * y su número de cuenta.
 *
 * @param req - Solicitud HTTP que contiene:
 *   - code: Código de la sala.
 *   - accountNumber: Número de cuenta del usuario.
 *
 * @param res - Respuesta HTTP que devuelve el resultado de la operación.
 *
 * @returns
 *   - 400: Si faltan el código o número de cuenta.
 *   - 404: Si el usuario o la sala no existen.
 *   - 400: Si la partida ya comenzó.
 *   - 200: Si el usuario ya pertenece a la sala.
 *   - 400: Si la sala alcanzó su capacidad máxima.
 *   - 200: Si el usuario se une correctamente.
 *   - 500: Si ocurre un error durante el proceso.
 *
 * El proceso realiza las siguientes validaciones:
 * 1. Verifica que se hayan enviado los datos requeridos.
 * 2. Comprueba que el usuario exista.
 * 3. Comprueba que la sala exista y obtiene el número de jugadores.
 * 4. Verifica que la sala se encuentre en estado WAITING.
 * 5. Comprueba si el usuario ya pertenece a la sala.
 * 6. Verifica que la sala tenga espacio disponible.
 * 7. Crea la relación entre el usuario y la sala.
 */
export const joinRoom = async (req: Request, res: Response) => {
  try {
    const { code, accountNumber, alias } = req.body;

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

    // 7. Validar el alias ANTES de escribir en la base de datos.
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

    // 8. Si hay espacio y el alias es válido, crear la relación.
    await prisma.roomPlayer.create({
      data: {
        roomId: room.id,
        userId: user.id
      }
    });

    AliasesStore.set(code, accountNumber, aliasCheck.value);

    return res.json({
      ok: true,
      message: "Te has unido exitosamente",
      data: {
        ...room,
        alias: aliasCheck.value,
        aliases: AliasesStore.getAllForRoom(code)
      }
    });
  } catch (error) {
    console.error("Error al unirse a la sala:", error);
    return res.status(500).json({
      ok: false,
      message: "Error al unirse a la sala"
    });
  }
};