import type { Card, playerBoard } from "../interfaces/game.interface.js";
import {
  GameSessionStatus,
  type GameSession,
  type WinPattern,
} from "../interfaces/gameSession.interface.js";
import { GameSessionsStore } from "../state/gameSessions.store.js";
import { AliasesStore } from "../state/aliases.store.js";
import { roomEvents } from "./room.service.js";
import { BoardOperations } from "../utils/board.operations.js";
import { PrismaClient } from "@prisma/client";
import { EventEmitter } from "events";

const prisma = new PrismaClient();

// Emisor de eventos para broadcast de cambios en sesiones
export const gameSessionEvents = new EventEmitter();

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
export const startGame = async (
  roomCode: string,
  boards: Record<string, playerBoard>,
  fullDeck: Card[],
  targetWinModes: string[]
): Promise<GameSession> => {
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
    targetWinModes,
    intervalId: null,
    createdAt: new Date(),
  };

  GameSessionsStore.set(session);
  scheduleNextCall(roomCode);

  // La sala pasa a PLAYING en BD: sale de la lista de disponibles
  // y joinRoom la rechaza mientras la partida esté en curso.
  await prisma.room.update({
    where: { code: roomCode },
    data: { status: "PLAYING" },
  });
  roomEvents.emit("rooms:changed");

  gameSessionEvents.emit("game:started", { roomCode, status: session.status });

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
      void finishGame(roomCode, null, null); // se acabó el mazo, nadie cantó lotería
      return;
    }

    const card = session.deck[session.cursor];
    session.calledCards.push(card as Card);
    session.cursor += 1;

    gameSessionEvents.emit("card:called", { roomCode, card, calledCount: session.calledCards.length });

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
  calledCards: Card[],
  targetWinModes: string[]
): { won: boolean; pattern: WinPattern | null } => {
  return BoardOperations.checkVictory(board, calledCards, targetWinModes);
};

/**
 * Un jugador grita "¡Lotería!". Se revalida en servidor (nunca confiar en
 * el cliente) y, si es válido, se cierra la partida y se declara ganador.
 */
export const claimVictory = async (
  roomCode: string,
  accountNumber: string
): Promise<{ won: boolean; pattern: WinPattern | null }> => {
  const session = GameSessionsStore.get(roomCode);

  if (!session) throw new GameSessionError(`No hay partida activa para la sala ${roomCode}`);
  if (session.status !== GameSessionStatus.PLAYING) {
    throw new GameSessionError("La partida ya terminó");
  }

  const board = session.boards[accountNumber];
  if (!board) throw new GameSessionError("Ese jugador no tiene tablero en esta partida");

  const result = checkVictory(board, session.calledCards, session.targetWinModes);

  if (result.won) {
    await finishGame(roomCode, accountNumber, result.pattern);
  }

  return result;
};

const finishGame = async (
  roomCode: string,
  winner: string | null,
  pattern: WinPattern | null
): Promise<void> => {
  const session = GameSessionsStore.get(roomCode);
  if (!session) return;

  if (session.intervalId) clearTimeout(session.intervalId);

  session.status = GameSessionStatus.FINISHED;
  session.winner = winner;
  session.winPattern = pattern;
  session.intervalId = null;

  gameSessionEvents.emit("game:finished", { roomCode, winner, pattern });

  // Persistir el resultado y cerrar la sala en BD.
  if (winner) {
    await prisma.$transaction([
      prisma.match.create({
        data: {
          roomCode,
          winnerAccount: winner,
          totalPlayers: Object.keys(session.boards).length,
          winMode: pattern ?? "FULL",
        },
      }),
      prisma.user.update({
        where: { accountNumber: winner },
        data: { totalWins: { increment: 1 } },
      }),
    ]);
  }

  await prisma.room.update({
    where: { code: roomCode },
    data: { status: "FINISHED" },
  });

  // Limpieza de memoria: la sesión y los alias dejan de ser necesarios.
  GameSessionsStore.delete(roomCode);
  AliasesStore.clearRoom(roomCode);
  roomEvents.emit("rooms:changed");
};

/** Detiene una partida manualmente (ej. el host cancela la sala). */
export const stopGame = async (roomCode: string): Promise<void> => {
  await finishGame(roomCode, null, null);
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
    targetWinModes: session.targetWinModes,
    players: Object.keys(session.boards).map((accountNumber) => ({
      accountNumber,
      alias: aliases[accountNumber] ?? accountNumber,
    })),
  };
};