import type { Server, Socket } from "socket.io";
import {
  createRoom,
  joinRoom,
  leaveRoom,
  getAvailableRooms,
} from "../services/room.service.js";

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
export const registerRoomHandlers = (_io: Server, socket: Socket): void => {
  const accountNumber = socket.data.accountNumber as string;

  socket.on("room:create", async (payload: { name?: unknown; maxPlayers?: unknown; alias?: unknown }, ack: unknown) => {
    try {
      const room = await createRoom(accountNumber, payload?.name, payload?.maxPlayers, payload?.alias);
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
};
