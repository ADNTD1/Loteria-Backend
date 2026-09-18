import { PrismaClient } from "@prisma/client";
import { EventEmitter } from "events";
import { generateRoomCode } from "../utils/generateRoomCode.js";
import { validateRoomName } from "../utils/validateRoomName.js";
import { AliasesStore, validateAlias } from "../state/aliases.store.js";
import { assignBoardToPlayer } from "./board.service.js";
import type { RoomSummary } from "../interfaces/room.interface.js";

const prisma = new PrismaClient();

// Emisor de eventos de salas; la capa de sockets se suscribe para hacer broadcast.
// - "rooms:changed": la lista de salas disponibles cambió (crear/unirse/salir/iniciar/borrar)
// - "room:playersChanged": ({ roomCode }) cambió la lista de jugadores de una sala
export const roomEvents = new EventEmitter();

export class RoomError extends Error {}

// Modos de victoria válidos; el host puede elegir varios.
export const VALID_WIN_MODES = [
  "LINE", "DIAGONAL", "ESCUADRA", "EQUIS",
  "CORNERS", "CENTER_2X2", "SQUARE_2X2", "FULL_BOARD",
] as const;

// --- Auto-borrado de salas vacías ---
// Si una sala en WAITING se queda sin jugadores, se borra pasado EMPTY_ROOM_TTL_MS.
const EMPTY_ROOM_TTL_MS = 60_000;
const JANITOR_INTERVAL_MS = 15_000;
const emptySince = new Map<string, number>(); // roomCode -> timestamp en que quedó vacía

export const startRoomJanitor = (): void => {
  const timer = setInterval(() => {
    void limpiarSalasVacias();
  }, JANITOR_INTERVAL_MS);

  // Que el temporizador no impida que el proceso termine (tests, shutdown).
  timer.unref();
};

/**
 * Borra las salas en WAITING que llevan EMPTY_ROOM_TTL_MS sin jugadores.
 * Consulta la base de datos en vez de un mapa en memoria, así sigue
 * funcionando después de reiniciar el servidor.
 */
export const limpiarSalasVacias = async (): Promise<number> => {
  const limite = new Date(Date.now() - EMPTY_ROOM_TTL_MS);

  const vacias = await prisma.room.findMany({
    where: {
      status: "WAITING",
      createdAt: { lt: limite },
      players: { none: {} },
    },
    select: { code: true },
  });

  for (const { code } of vacias) {
    await prisma.room.delete({ where: { code } });
    AliasesStore.clearRoom(code);
    emptySince.delete(code);
  }

  if (vacias.length > 0) roomEvents.emit("rooms:changed");

  return vacias.length;
};

/**
 * Al arrancar el servidor, las partidas que vivían en memoria ya no existen.
 * Las salas que quedaron en PLAYING se cierran para que no se queden colgadas
 * ni aparezcan como partidas en curso que nadie puede terminar.
 */
export const cerrarSalasHuerfanas = async (): Promise<number> => {
  const { count } = await prisma.room.updateMany({
    where: { status: "PLAYING" },
    data: { status: "FINISHED" },
  });

  if (count > 0) roomEvents.emit("rooms:changed");

  return count;
};

/** Marca la sala como inactiva si no quedan jugadores esperando. */
const markEmptyState = async (code: string): Promise<void> => {
  const count = await prisma.roomPlayer.count({ where: { room: { code } } });
  if (count === 0) {
    emptySince.delete(code);
    await prisma.room.updateMany({
      where: { code, status: "WAITING" },
      data: { status: "FINISHED" },
    });
    AliasesStore.clearRoom(code);
    roomEvents.emit("rooms:changed");
  } else {
    emptySince.delete(code);
  }
};

/**
 * Crea una sala: el host la nombra, se genera un código único y el host
 * queda registrado como primer jugador, todo en una transacción.
 */
export const createRoom = async (
  hostAccountNumber: string,
  name: unknown,
  maxPlayers: unknown,
  winModes: unknown,
  alias?: unknown
) => {
  const nameCheck = validateRoomName(name);
  if (!nameCheck.ok) throw new RoomError(nameCheck.error);

  if (!Number.isInteger(maxPlayers) || (maxPlayers as number) < 2) {
    throw new RoomError("La sala debe permitir al menos 2 jugadores");
  }

  // Normaliza la lista de modos: solo se aceptan los conocidos, sin duplicados.
  const requestedModes = Array.isArray(winModes)
    ? winModes.filter((m): m is string => typeof m === "string")
    : [];
  const validModes = [...new Set(requestedModes)].filter((m) =>
    (VALID_WIN_MODES as readonly string[]).includes(m)
  );
  const normalizedModes = validModes.length > 0 ? validModes : ["FULL_BOARD"];

  let aliasValue: string | null = null;
  if (alias !== undefined && alias !== null) {
    const aliasCheck = validateAlias(alias);
    if (!aliasCheck.ok) throw new RoomError(aliasCheck.error);
    aliasValue = aliasCheck.value;
  }

  const hostUser = await prisma.user.findUnique({
    where: { accountNumber: hostAccountNumber },
  });
  if (!hostUser) throw new RoomError("El usuario no existe");

  let code: string;
  do {
    code = generateRoomCode();
  } while (await prisma.room.findUnique({ where: { code } }));

  const newRoom = await prisma.$transaction(async (tx) => {
    const room = await tx.room.create({
      data: {
        hostAccountNumber,
        code,
        name: nameCheck.value,
        status: "WAITING",
        maxPlayers: maxPlayers as number,
        winModes: normalizedModes,
      },
    });

    await tx.roomPlayer.create({
      data: {
        roomId: room.id,
        userId: hostUser.id,
      },
    });

    return room;
  });

  if (aliasValue) AliasesStore.set(code, hostAccountNumber, aliasValue);
  emptySince.delete(code);

  // RF-04: el host tambien es jugador, se le asigna su tabla de una vez.
  const hostBoard = await assignBoardToPlayer(code, hostAccountNumber);

  roomEvents.emit("rooms:changed");
  roomEvents.emit("room:playersChanged", { roomCode: code });

  return { ...newRoom, board: hostBoard };
};

/**
 * Une un jugador a una sala en WAITING. Idempotente: si ya pertenece,
 * devuelve la sala sin duplicar el registro.
 */
export const joinRoom = async (
  accountNumber: string,
  code: unknown,
  alias: unknown
) => {
  if (typeof code !== "string" || !code) throw new RoomError("El código de sala es requerido");

  const aliasCheck = validateAlias(alias);
  if (!aliasCheck.ok) throw new RoomError(aliasCheck.error);

  const user = await prisma.user.findUnique({ where: { accountNumber } });
  if (!user) throw new RoomError("El usuario no existe");

  const room = await prisma.room.findUnique({
    where: { code },
    include: { _count: { select: { players: true } } },
  });
  if (!room) throw new RoomError("La sala especificada no fue encontrada");

  if (room.status === "FINISHED") throw new RoomError("La sala está inactiva y ya no está disponible");
  
  if (room._count.players === 0) {
    await prisma.room.updateMany({
      where: { code, status: "WAITING" },
      data: { status: "FINISHED" },
    });
    throw new RoomError("La sala está inactiva y ya no está disponible");
  }

  const existingPlayer = await prisma.roomPlayer.findFirst({
    where: { roomId: room.id, userId: user.id },
  });

  if (existingPlayer) {
    // Idempotente: se le devuelve la MISMA tabla que ya tenia.
    const board = await assignBoardToPlayer(code, accountNumber);
    return { room, board, alreadyJoined: true, alias: aliasCheck.value, aliases: AliasesStore.getAllForRoom(code) };
  }

  if (room.status !== "WAITING") throw new RoomError("La partida de la sala ya comenzó");
  if (room._count.players >= room.maxPlayers) throw new RoomError("La sala está llena");

  if (AliasesStore.isTaken(code, accountNumber, aliasCheck.value)) {
    throw new RoomError(`El alias "${aliasCheck.value}" ya está en uso en esta sala`);
  }

  try {
    await prisma.roomPlayer.create({
      data: { roomId: room.id, userId: user.id },
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      // Ignorar si se unio concurrentemente (React Strict Mode o doble clic)
      const board = await assignBoardToPlayer(code, accountNumber);
      return { room, board, alreadyJoined: true, alias: aliasCheck.value, aliases: AliasesStore.getAllForRoom(code) };
    }
    throw error;
  }

  AliasesStore.set(code, accountNumber, aliasCheck.value);
  emptySince.delete(code);

  // RF-04: al unirse, el jugador recibe su tabla valida antes de comenzar.
  const board = await assignBoardToPlayer(code, accountNumber);

  roomEvents.emit("rooms:changed");
  roomEvents.emit("room:playersChanged", { roomCode: code });

  return { room, board, alreadyJoined: false, alias: aliasCheck.value, aliases: AliasesStore.getAllForRoom(code) };
};

/**
 * Saca al jugador de una sala en WAITING. Si la sala queda vacía,
 * se marca como inactiva (status FINISHED) y se libera.
 */
export const leaveRoom = async (accountNumber: string, code: unknown): Promise<void> => {
  if (typeof code !== "string" || !code) throw new RoomError("El código de sala es requerido");

  const room = await prisma.room.findUnique({ where: { code } });
  if (!room) throw new RoomError("La sala especificada no fue encontrada");

  if (room.status !== "WAITING") throw new RoomError("No se puede abandonar una partida en curso");

  const user = await prisma.user.findUnique({ where: { accountNumber } });
  if (!user) throw new RoomError("El usuario no existe");

  await prisma.roomPlayer.deleteMany({
    where: { roomId: room.id, userId: user.id },
  });

  AliasesStore.remove(code, accountNumber);
  await markEmptyState(code);

  roomEvents.emit("rooms:changed");
  roomEvents.emit("room:playersChanged", { roomCode: code });
};

/** Salas en WAITING con jugadores esperando, para la lista pública del lobby. */
export const getAvailableRooms = async (): Promise<RoomSummary[]> => {
  const rooms = await prisma.room.findMany({
    where: { status: "WAITING" },
    include: { _count: { select: { players: true } } },
    orderBy: { createdAt: "desc" },
  });

  return rooms
    .filter((room) => room._count.players > 0)
    .map((room) => ({
      code: room.code,
      name: room.name,
      hostAccountNumber: room.hostAccountNumber,
      players: room._count.players,
      maxPlayers: room.maxPlayers,
    }));
};

/** Jugadores de una sala con su alias (si pusieron uno). */
export const getRoomPlayers = async (code: string) => {
  const roomPlayers = await prisma.roomPlayer.findMany({
    where: { room: { code } },
    include: { user: true },
  });

  const aliases = AliasesStore.getAllForRoom(code);

  return roomPlayers.map((rp) => ({
    accountNumber: rp.user.accountNumber,
    alias: aliases[rp.user.accountNumber] ?? rp.user.accountNumber,
  }));
};

/** Verifica que accountNumber sea el host de la sala; usado por game:start y game:stop. */
export const assertRoomHost = async (code: string, accountNumber: string) => {
  const room = await prisma.room.findUnique({ where: { code } });
  if (!room) throw new RoomError("La sala no existe");
  if (room.hostAccountNumber !== accountNumber) {
    throw new RoomError("Sólo el host puede realizar esta acción");
  }
  return room;
};
