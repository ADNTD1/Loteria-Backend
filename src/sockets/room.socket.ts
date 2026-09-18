import type { Server, Socket } from "socket.io";
import {
  createRoom,
  joinRoom,
  leaveRoom,
  getAvailableRooms,
  RoomError,
} from "../services/room.service.js";
import { AliasesStore } from "../state/aliases.store.js";

// El cliente solo avisa QUÉ jugada hizo; el servidor arma el texto del mensaje,
// así el feed de notificaciones no se puede usar como chat libre.
const PATTERN_LABELS: Record<string, string> = {
  LINE: "completó una línea",
  CORNERS: "consiguió las cuatro esquinas",
  FULL_BOARD: "completó el cartón lleno",
  CENTER_2X2: "consiguió el centro 2x2",
  SQUARE_2X2: "consiguió un cuadrito 2x2",
};

// Respuesta estándar de los ack callbacks, misma filosofía que el REST viejo.
type Ack = (response: { ok: boolean; data?: unknown; message?: string }) => void;

const ok = (ack: unknown, data?: unknown) => {
  if (typeof ack === "function") (ack as Ack)({ ok: true, data });
};

const fail = (ack: unknown, error: unknown) => {
  if (typeof ack === "function") {
    (ack as Ack)({
      ok: false,
      message: error instanceof Error ? error.message : "Error interno",
    });
  }
};

/**
 * Handlers de salas. El accountNumber siempre sale del JWT del handshake
 * (socket.data.accountNumber), nunca del payload del cliente.
 */
export const registerRoomHandlers = (io: Server, socket: Socket): void => {
  const accountNumber = socket.data.accountNumber as string;

  socket.on("room:create", async (payload: { name?: unknown; maxPlayers?: unknown; winModes?: unknown[]; alias?: unknown }, ack: unknown) => {
    try {
      const room = await createRoom(accountNumber, payload?.name, payload?.maxPlayers, payload?.winModes, payload?.alias);
      socket.join(room.code);
      socket.data.roomCode = room.code;
      ok(ack, room);
    } catch (error) {
      fail(ack, error);
    }
  });

  socket.on("room:join", async (payload: { code?: string; alias?: unknown }, ack: unknown) => {
    try {
      const result = await joinRoom(accountNumber, payload?.code, payload?.alias);
      socket.join(payload?.code as string);
      socket.data.roomCode = payload?.code;
      ok(ack, result);
    } catch (error) {
      fail(ack, error);
    }
  });

  socket.on("room:leave", async (payload: { code?: string }, ack: unknown) => {
    try {
      await leaveRoom(accountNumber, payload?.code);
      socket.leave(payload?.code as string);
      if (socket.data.roomCode === payload?.code) socket.data.roomCode = undefined;
      ok(ack);
    } catch (error) {
      fail(ack, error);
    }
  });

  socket.on("rooms:list", async (_payload: unknown, ack: unknown) => {
    try {
      ok(ack, await getAvailableRooms());
    } catch (error) {
      fail(ack, error);
    }
  });

  // Notificación de jugada. El cliente manda solo { code, pattern };
  // el servidor construye el mensaje con el alias y lo retransmite a la sala.
  socket.on("room:notification", (payload: { code?: string; pattern?: string }, ack: unknown) => {
    try {
      const code = typeof payload?.code === "string" ? payload.code : (socket.data.roomCode as string);
      if (!code) {
        fail(ack, new RoomError("Falta el código de sala"));
        return;
      }

      if (!socket.rooms.has(code)) {
        fail(ack, new RoomError("No puedes notificar una jugada en una sala a la que no perteneces"));
        return;
      }

      const label = typeof payload?.pattern === "string" ? PATTERN_LABELS[payload.pattern] : undefined;
      if (!label) {
        fail(ack, new RoomError("Jugada no reconocida"));
        return;
      }

      const alias = AliasesStore.get(code, accountNumber) ?? accountNumber;
      const notification = {
        accountNumber,
        alias,
        pattern: payload!.pattern,
        message: `${alias} ${label}`,
      };

      io.to(code).emit("room:notification", notification);
      ok(ack, notification);
    } catch (error) {
      fail(ack, error);
    }
  });
};
