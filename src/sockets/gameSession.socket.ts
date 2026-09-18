import { Server as HTTPServer } from "http";
import { Server } from "socket.io";
import { verifyToken } from "../utils/jwt.utils.js";
import { gameSessionEvents } from "../services/gameSession.service.js";
import {
  roomEvents,
  getAvailableRooms,
  getRoomPlayers,
  startRoomJanitor,
  cerrarSalasHuerfanas,
} from "../services/room.service.js";
import { registerRoomHandlers } from "./room.socket.js";
import { registerGameHandlers } from "./game.socket.js";
import { LOBBY_CHANNEL, userChannel } from "./channels.js";

export const initGameSessionSocket = (httpServer: HTTPServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
      methods: ["GET", "POST"],
    },
  });

  // Middleware de autenticación: valida JWT en el handshake
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Token no proporcionado"));
      }

      const payload = verifyToken(token);
      socket.data.accountNumber = payload.accountNumber;
      next();
    } catch (error) {
      next(new Error("Token inválido o expirado"));
    }
  });

  // Al conectar
  io.on("connection", (socket) => {
    const accountNumber = socket.data.accountNumber as string;

    // Todos los clientes escuchan la lista de salas y tienen su canal personal.
    socket.join(LOBBY_CHANNEL);
    socket.join(userChannel(accountNumber));

    registerRoomHandlers(io, socket);
    registerGameHandlers(io, socket);
  });

  // --- Broadcast de eventos de la partida ---
  gameSessionEvents.on("game:started", (data) => {
    io.to(data.roomCode).emit("game:started", data);
  });

  gameSessionEvents.on("card:called", (data) => {
    io.to(data.roomCode).emit("card:called", data);
  });

  // Alguien se llevó un patrón (esquinas, centro, etc.): suma puntos y la partida sigue.
  gameSessionEvents.on("game:pattern-claimed", (data) => {
    io.to(data.roomCode).emit("game:pattern-claimed", data);
  });

  gameSessionEvents.on("game:finished", (data) => {
    io.to(data.roomCode).emit("game:finished", data);
  });

  // --- Broadcast de eventos de salas ---
  roomEvents.on("rooms:changed", async () => {
    io.to(LOBBY_CHANNEL).emit("rooms:updated", await getAvailableRooms());
  });

  roomEvents.on("room:playersChanged", async ({ roomCode }) => {
    io.to(roomCode).emit("room:players", await getRoomPlayers(roomCode));
  });

  // Las partidas viven en memoria: si el servidor se reinició, las salas que
  // quedaron "jugando" ya no tienen partida detrás y hay que cerrarlas.
  void cerrarSalasHuerfanas().then((cerradas) => {
    if (cerradas > 0) console.log(`Salas huérfanas cerradas al arrancar: ${cerradas}`);
  });

  // Borrado automático de salas que llevan 1 minuto sin jugadores.
  startRoomJanitor();

  return io;
};
