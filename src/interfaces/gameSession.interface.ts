import type { Card, playerBoard } from "./game.interface.js";

export enum GameSessionStatus {
  WAITING = "WAITING",
  PLAYING = "PLAYING",
  FINISHED = "FINISHED",
}

export type WinPattern = "LINE" | "FULL_BOARD" | "CORNERS" | "CENTER_2X2" | "SQUARE_2X2";

export interface GameSession {
  roomCode: string;
  status: GameSessionStatus;
  deck: Card[];              // mazo completo, ya barajado, orden de canto
  calledCards: Card[];       // cartas ya cantadas, en orden
  cursor: number;            // índice de la siguiente carta a cantar dentro de deck
  boards: Record<string, playerBoard>; // accountNumber -> tabla del jugador
  winner: string | null;
  winPattern: WinPattern | null;
  targetWinModes: string[];
  intervalId: ReturnType<typeof setTimeout> | null; // referencia del cantor automático, para poder detenerlo
  createdAt: Date;
}