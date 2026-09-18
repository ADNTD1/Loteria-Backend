import type { GameSession } from "../interfaces/gameSession.interface.js";

// Almacén temporal en memoria de las partidas activas.
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