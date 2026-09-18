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

// Tiempos del cantor automático (ms)
const INITIAL_CALL_DELAY_MS = 10000;
const CALL_INTERVAL_MS = 4000;

/**
 * Puntos por patrón: entre menos formas hay de completarlo, más vale.
 * Línea (10 posiciones) y cuadrito (9 posiciones) son los más fáciles;
 * esquinas y centro solo se arman de una forma; la llena es el cierre.
 */
export const PATTERN_POINTS: Record<WinPattern, number> = {
  LINE: 1,
  SQUARE_2X2: 1,
  CORNERS: 2,
  CENTER_2X2: 2,
  FULL_BOARD: 5,
};

/** Por qué terminó la partida. */
type EndReason = "FULL_BOARD" | "DECK_EXHAUSTED" | "STOPPED";

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

  // La llena siempre está activa: los demás patrones solo dan puntos,
  // y es la llena la que cierra la partida.
  const winModes = [...new Set([...targetWinModes, "FULL_BOARD"])];

  const session: GameSession = {
    roomCode,
    status: GameSessionStatus.PLAYING,
    deck: shuffle(fullDeck),
    calledCards: [],
    cursor: 0,
    boards,
    winner: null,
    winPattern: null,
    targetWinModes: winModes,
    scores: Object.fromEntries(Object.keys(boards).map((account) => [account, 0])),
    claimedPatterns: {},
    lastScoreAt: {},
    intervalId: null,
    createdAt: new Date(),
  };

  GameSessionsStore.set(session);
  scheduleNextCall(roomCode, true);

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
const scheduleNextCall = (roomCode: string, isFirstCall: boolean = false): void => {
  const delay = isFirstCall ? INITIAL_CALL_DELAY_MS : CALL_INTERVAL_MS;
  const timeout = setTimeout(() => {
    const session = GameSessionsStore.get(roomCode);

    if (!session || session.status !== GameSessionStatus.PLAYING) return;

    if (session.cursor >= session.deck.length) {
      // Se acabó el mazo sin que nadie hiciera llena: gana el de más puntos.
      void finishGame(roomCode, "DECK_EXHAUSTED");
      return;
    }

    const card = session.deck[session.cursor];
    session.calledCards.push(card as Card);
    session.cursor += 1;

    gameSessionEvents.emit("card:called", { roomCode, card, calledCount: session.calledCards.length });

    scheduleNextCall(roomCode, false);
  }, delay);

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

export interface ClaimResult {
  won: boolean;
  patterns: WinPattern[];             // patrones que se acaba de llevar
  points: number;                     // puntos ganados con este canto
  scores: Record<string, number>;
  gameOver: boolean;
  alreadyClaimed: boolean;            // los completó, pero alguien más los cantó antes
}

/**
 * Un jugador grita "¡Lotería!". Se revalida en servidor (nunca confiar en
 * el cliente). Cada patrón se lo lleva el primero que lo canta y suma puntos;
 * un mismo jugador puede llevarse varios. La partida solo se cierra cuando
 * alguien completa la llena.
 */
export const claimVictory = async (
  roomCode: string,
  accountNumber: string
): Promise<ClaimResult> => {
  const session = GameSessionsStore.get(roomCode);

  if (!session) throw new GameSessionError(`No hay partida activa para la sala ${roomCode}`);
  if (session.status !== GameSessionStatus.PLAYING) {
    throw new GameSessionError("La partida ya terminó");
  }

  const board = session.boards[accountNumber];
  if (!board) throw new GameSessionError("Ese jugador no tiene tablero en esta partida");

  const completed = BoardOperations.completedPatterns(
    board,
    session.calledCards,
    session.targetWinModes
  );
  const nuevos = completed.filter((pattern) => !session.claimedPatterns[pattern]);

  if (nuevos.length === 0) {
    return {
      won: false,
      patterns: [],
      points: 0,
      scores: { ...session.scores },
      gameOver: false,
      alreadyClaimed: completed.length > 0,
    };
  }

  let points = 0;
  for (const pattern of nuevos) {
    session.claimedPatterns[pattern] = accountNumber;
    points += PATTERN_POINTS[pattern];
  }

  session.scores[accountNumber] = (session.scores[accountNumber] ?? 0) + points;
  session.lastScoreAt[accountNumber] = Date.now();

  const cerroPartida = nuevos.includes("FULL_BOARD");

  if (cerroPartida) {
    await finishGame(roomCode, "FULL_BOARD");
  } else {
    gameSessionEvents.emit("game:pattern-claimed", {
      roomCode,
      accountNumber,
      alias: AliasesStore.getAllForRoom(roomCode)[accountNumber] ?? accountNumber,
      patterns: nuevos,
      points,
      scores: { ...session.scores },
    });
  }

  return {
    won: true,
    patterns: nuevos,
    points,
    scores: { ...session.scores },
    gameOver: cerroPartida,
    alreadyClaimed: false,
  };
};

/**
 * Gana quien acumuló más puntos. Si hay empate, gana quien llegó a ese
 * puntaje primero. Nadie suma puntos => no hay ganador.
 */
const resolveWinner = (session: GameSession): string | null => {
  const conPuntos = Object.entries(session.scores).filter(([, points]) => points > 0);
  if (conPuntos.length === 0) return null;

  conPuntos.sort(([cuentaA, puntosA], [cuentaB, puntosB]) => {
    if (puntosB !== puntosA) return puntosB - puntosA;
    return (session.lastScoreAt[cuentaA] ?? 0) - (session.lastScoreAt[cuentaB] ?? 0);
  });

  return conPuntos[0]![0];
};

const finishGame = async (roomCode: string, reason: EndReason): Promise<void> => {
  const session = GameSessionsStore.get(roomCode);
  if (!session) return;

  if (session.intervalId) clearTimeout(session.intervalId);

  // Si el host canceló, la partida no cuenta para nadie.
  const winner = reason === "STOPPED" ? null : resolveWinner(session);
  const pattern: WinPattern | null = reason === "FULL_BOARD" ? "FULL_BOARD" : null;
  const scores = { ...session.scores };

  session.status = GameSessionStatus.FINISHED;
  session.winner = winner;
  session.winPattern = pattern;
  session.intervalId = null;

  gameSessionEvents.emit("game:finished", { roomCode, winner, pattern, reason, scores });

  // Persistir el resultado y cerrar la sala en BD.
  if (winner) {
    await prisma.$transaction([
      prisma.match.create({
        data: {
          roomCode,
          winnerAccount: winner,
          totalPlayers: Object.keys(session.boards).length,
          winMode: reason === "FULL_BOARD" ? "FULL_BOARD" : "POINTS",
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
  await finishGame(roomCode, "STOPPED");
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
    scores: { ...session.scores },
    claimedPatterns: { ...session.claimedPatterns },
    players: Object.keys(session.boards).map((accountNumber) => ({
      accountNumber,
      alias: aliases[accountNumber] ?? accountNumber,
      points: session.scores[accountNumber] ?? 0,
    })),
  };
};