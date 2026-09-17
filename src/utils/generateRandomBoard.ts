import type { Card, playerBoard } from "../interfaces/game.interface.js";
import { BoardOperations } from "./board.operations.js";

export const generateRandomBoard = (accountNumber: string, allCards: Card[]): playerBoard => {
  return BoardOperations.generateRandomBoard(accountNumber, allCards);
};
