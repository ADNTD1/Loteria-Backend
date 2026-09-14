import type { GameSession } from "../interfaces/gameSession.interface.js";

// Almacén temporal en memoria, igual filosofía que activeRooms en room.controller.ts
// Cuando se migre a Prisma esto se vuelve un repository real (GameSessionRepository)
const activeGameSessions = new Map<string, GameSession>();

export const GameSessionsStore = {
  get(roomCode: string): GameSession | undefined {
    return activeGameSessions.get(roomCode);
  },

  set(session: GameSession): void {
    activeGameSessions.set(session.roomCode, session);
  },

  delete(roomCode: string): void {
    activeGameSessions.delete(roomCode);
  },

  has(roomCode: string): boolean {
    return activeGameSessions.has(roomCode);
  },
};