import type { playerBoard } from "../interfaces/game.interface.js";

/**
 * Almacén temporal en memoria de las tablas asignadas a cada jugador,
 * agrupadas por sala. Misma filosofía que GameSessionsStore.
 *
 * Estructura:  roomCode -> ( accountNumber -> playerBoard )
 *
 * Cuando se migre a Prisma, esto se reemplaza por PlayerBoard/BoardCard.
 */
const roomBoards = new Map<string, Map<string, playerBoard>>();

export const RoomBoardsStore = {
  /** Guarda (o reemplaza) la tabla de un jugador dentro de una sala. */
  set(roomCode: string, accountNumber: string, board: playerBoard): void {
    let boards = roomBoards.get(roomCode);

    if (!boards) {
      boards = new Map<string, playerBoard>();
      roomBoards.set(roomCode, boards);
    }

    boards.set(accountNumber, board);
  },

  /** Devuelve la tabla de un jugador, o undefined si aún no tiene. */
  get(roomCode: string, accountNumber: string): playerBoard | undefined {
    return roomBoards.get(roomCode)?.get(accountNumber);
  },

  has(roomCode: string, accountNumber: string): boolean {
    return roomBoards.get(roomCode)?.has(accountNumber) ?? false;
  },

  /** Todas las tablas de una sala en el formato que espera startGame(). */
  getAll(roomCode: string): Record<string, playerBoard> {
    const boards = roomBoards.get(roomCode);
    if (!boards) return {};

    return Object.fromEntries(boards.entries());
  },

  /** Cuántos jugadores ya tienen tabla en esa sala. */
  count(roomCode: string): number {
    return roomBoards.get(roomCode)?.size ?? 0;
  },

  /** Quita la tabla de un jugador (ej. si abandona la sala antes de iniciar). */
  remove(roomCode: string, accountNumber: string): void {
    roomBoards.get(roomCode)?.delete(accountNumber);
  },

  /** Limpia todas las tablas de la sala (RF-17: reiniciar para nueva partida). */
  clear(roomCode: string): void {
    roomBoards.delete(roomCode);
  },
};
