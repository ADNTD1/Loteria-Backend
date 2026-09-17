import type { Card, playerBoard } from "../interfaces/game.interface.js";
import {
  GameSessionStatus,
  type GameSession,
  type WinPattern,
} from "../interfaces/gameSession.interface.js";
import { GameSessionsStore } from "../state/gameSessions.store.js";
import { AliasesStore } from "../state/aliases.store.js";

// Cada cuanto tiempo el "cantor" automático canta una carta nueva (ms)
const CALL_INTERVAL_MS = 4000;

const shuffle = <T>(arr: T[]): T[] => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = temp;
  }
  return copy;
};

export class GameSessionError extends Error {}

/**
 * Inicia una partida para una sala: baraja el mazo completo y arranca
 * el cantor automático, que va agregando una carta cada CALL_INTERVAL_MS.
 */
export const startGame = (
  roomCode: string,
  boards: Record<string, playerBoard>,
  fullDeck: Card[]
): GameSession => {
      const existing = GameSessionsStore.get(roomCode);
  if (existing && existing.status === GameSessionStatus.PLAYING) {
    throw new GameSessionError(`La sala ${roomCode} ya tiene una partida activa`);
  }

  if (Object.keys(boards).length === 0) {
    throw new GameSessionError("No hay tableros asignados, no se puede iniciar la partida");
  }

  const session: GameSession = {
    roomCode,
    status: GameSessionStatus.PLAYING,
    deck: shuffle(fullDeck),
    calledCards: [],
    cursor: 0,
    boards,
    winner: null,
    winPattern: null,
    intervalId: null,
    createdAt: new Date(),
  };

  GameSessionsStore.set(session);
  scheduleNextCall(roomCode);

  return session;
};
/**
 * Programa el siguiente canto automático. Se auto-detiene si ya no hay
 * cartas, si ya hay ganador, o si la partida fue detenida manualmente.
 */
const scheduleNextCall = (roomCode: string): void => {
  const timeout = setTimeout(() => {
    const session = GameSessionsStore.get(roomCode);

    if (!session || session.status !== GameSessionStatus.PLAYING) return;

    if (session.cursor >= session.deck.length) {
      finishGame(roomCode, null, null); // se acabó el mazo, nadie cantó lotería
      return;
    }

    const card = session.deck[session.cursor];
    session.calledCards.push(card as Card);
    session.cursor += 1;

    scheduleNextCall(roomCode);
  }, CALL_INTERVAL_MS);

  const session = GameSessionsStore.get(roomCode);
  if (session) session.intervalId = timeout;
};
/**
 * Valida si el tablero de un jugador tiene un patrón ganador respecto a
 * las cartas ya cantadas. Esta es la validación "oficial" del servidor,
 * el cliente nunca decide quién gana.
 */
export const checkVictory = (
  board: playerBoard,
  calledCards: Card[]
): { won: boolean; pattern: WinPattern | null } => {
  const calledIds = new Set(calledCards.map((c) => c.id));
  const marks = board.cards.map((c) => calledIds.has(c.id));

  const isLineComplete = (indexes: number[]) => indexes.every((i) => marks[i]);

  const lines: number[][] = [
    [0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], [12, 13, 14, 15],
    [0, 4, 8, 12], [1, 5, 9, 13], [2, 6, 10, 14], [3, 7, 11, 15],
    [0, 5, 10, 15], [3, 6, 9, 12],
  ];

  const corners: number[] = [0, 3, 12, 15]; // esquinas del 4x4

  if (marks.every(Boolean)) {
    return { won: true, pattern: "FULL_BOARD" };
  }

  if (isLineComplete(corners)) {
    return { won: true, pattern: "CORNERS" };
  }

  if (lines.some(isLineComplete)) {
    return { won: true, pattern: "LINE" };
  }

  return { won: false, pattern: null };
};

/**
 * Un jugador grita "¡Lotería!". Se revalida en servidor (nunca confiar en
 * el cliente) y, si es válido, se cierra la partida y se declara ganador.
 */
export const claimVictory = (
  roomCode: string,
  accountNumber: string
): { won: boolean; pattern: WinPattern | null } => {
  const session = GameSessionsStore.get(roomCode);

  if (!session) throw new GameSessionError(`No hay partida activa para la sala ${roomCode}`);
  if (session.status !== GameSessionStatus.PLAYING) {
    throw new GameSessionError("La partida ya terminó");
  }

  const board = session.boards[accountNumber];
  if (!board) throw new GameSessionError("Ese jugador no tiene tablero en esta partida");

  const result = checkVictory(board, session.calledCards);

  if (result.won) {
    finishGame(roomCode, accountNumber, result.pattern);
  }

  return result;
};

const finishGame = (
  roomCode: string,
  winner: string | null,
  pattern: WinPattern | null
): void => {
  const session = GameSessionsStore.get(roomCode);
  if (!session) return;

  if (session.intervalId) clearTimeout(session.intervalId);

  session.status = GameSessionStatus.FINISHED;
  session.winner = winner;
  session.winPattern = pattern;
  session.intervalId = null;
};

/** Detiene una partida manualmente (ej. el host cancela la sala). */
export const stopGame = (roomCode: string): void => {
  finishGame(roomCode, null, null);
};

/** Estado público de la partida, sin exponer los tableros de los demás jugadores. */
export const getPublicState = (roomCode: string) => {
  const session = GameSessionsStore.get(roomCode);
  if (!session) throw new GameSessionError(`No hay partida activa para la sala ${roomCode}`);

  const aliases = AliasesStore.getAllForRoom(roomCode);

  return {
    roomCode: session.roomCode,
    status: session.status,
    calledCards: session.calledCards,
    lastCard: session.calledCards[session.calledCards.length - 1] ?? null,
    winner: session.winner,
    winnerAlias: session.winner ? aliases[session.winner] ?? session.winner : null,
    winPattern: session.winPattern,
    players: Object.keys(session.boards).map((accountNumber) => ({
      accountNumber,
      alias: aliases[accountNumber] ?? accountNumber,
    })),
  };
};