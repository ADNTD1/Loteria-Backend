import { Server as HTTPServer } from "http";
import { Server } from "socket.io";
import { verifyToken } from "../utils/jwt.utils.js";
import { gameSessionEvents } from "../services/gameSession.service.js";

export const initGameSessionSocket = (httpServer: HTTPServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
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
    // Escucha evento del cliente para unirse a una sala
    socket.on("room:join", (data: { roomCode: string }) => {
      const { roomCode } = data;
      socket.join(roomCode);
      socket.data.roomCode = roomCode;
    });

    socket.on("disconnect", () => {
      // El cliente se fue
    });
  });

  // Suscribirse a los eventos del servicio de juego y hacer broadcast
  gameSessionEvents.on("game:started", (data) => {
    io.to(data.roomCode).emit("game:started", data);
  });

  gameSessionEvents.on("card:called", (data) => {
    io.to(data.roomCode).emit("card:called", data);
  });

  gameSessionEvents.on("game:finished", (data) => {
    io.to(data.roomCode).emit("game:finished", data);
  });

  return io;
};
