import type { playerBoard } from "../interfaces/game.interface.js";
import { CardRepository } from "../repositories/card.repository.js";
import { RoomBoardsStore } from "../state/roomBoards.store.js";
import { BoardOperations } from "../utils/board.operations.js";

const cardRepository = new CardRepository();

export class BoardAssignmentError extends Error {}

/**
 * RF-04: asigna una tabla válida a un jugador en el momento en que se une
 * a la sala (no hasta que inicie la partida).
 *
 * Es idempotente: si el jugador ya tiene tabla en esa sala se le devuelve la
 * misma. Así una reconexión o un segundo POST /join no le cambia la tabla.
 */
export const assignBoardToPlayer = async (
  roomCode: string,
  accountNumber: string
): Promise<playerBoard> => {
  if (!roomCode || !accountNumber) {
    throw new BoardAssignmentError("roomCode y accountNumber son obligatorios");
  }

  const existing = RoomBoardsStore.get(roomCode, accountNumber);
  if (existing) return existing;

  const allCards = await cardRepository.findAll();

  if (allCards.length < BoardOperations.BOARD_SIZE) {
    throw new BoardAssignmentError(
      "No hay suficientes cartas en la base de datos para generar una tabla"
    );
  }

  const board = BoardOperations.generateRandomBoard(accountNumber, allCards);

  // Doble verificación antes de guardar (RF-05: sin cartas repetidas).
  if (!BoardOperations.isValidBoard(board)) {
    throw new BoardAssignmentError("Se generó una tabla inválida, intenta de nuevo");
  }

  RoomBoardsStore.set(roomCode, accountNumber, board);

  return board;
};

/** Todas las tablas ya asignadas en una sala (para arrancar la partida). */
export const getBoardsForRoom = (roomCode: string): Record<string, playerBoard> => {
  return RoomBoardsStore.getAll(roomCode);
};

/** Tabla de un jugador concreto. */
export const getPlayerBoard = (
  roomCode: string,
  accountNumber: string
): playerBoard | undefined => {
  return RoomBoardsStore.get(roomCode, accountNumber);
};

/** RF-17: limpiar tablas para una nueva partida. */
export const clearBoardsForRoom = (roomCode: string): void => {
  RoomBoardsStore.clear(roomCode);
};
