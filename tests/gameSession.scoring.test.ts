import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mocks de Prisma: estas pruebas no necesitan Postgres.
const { matchCreate, userUpdate, roomUpdate, transaction } = vi.hoisted(() => ({
  matchCreate: vi.fn(),
  userUpdate: vi.fn(),
  roomUpdate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: class {
    match = { create: matchCreate };
    user = { update: userUpdate, findUnique: vi.fn() };
    room = { update: roomUpdate, findUnique: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() };
    roomPlayer = { count: vi.fn(), deleteMany: vi.fn(), findFirst: vi.fn() };
    $transaction = transaction;
  },
}));

const { claimVictory, gameSessionEvents, PATTERN_POINTS } = await import(
  '../src/services/gameSession.service.js'
);
const { GameSessionsStore } = await import('../src/state/gameSessions.store.js');
const { GameSessionStatus } = await import('../src/interfaces/gameSession.interface.js');

type Carta = { id: number; name: string; imgUrl: string };

const CARTAS: Carta[] = Array.from({ length: 16 }, (_, i) => ({
  id: i + 1,
  name: `Carta ${i + 1}`,
  imgUrl: `url-${i + 1}.png`,
}));

const ESQUINAS = [0, 3, 12, 15];
const PRIMERA_LINEA = [0, 1, 2, 3];

/** Arma una partida en curso con dos jugadores que comparten la misma tabla. */
const sembrarPartida = (calledIndexes: number[], roomCode = 'ABC-123') => {
  const board = (accountNumber: string) => ({ accountNumber, cards: [...CARTAS] });

  GameSessionsStore.set({
    roomCode,
    status: GameSessionStatus.PLAYING,
    deck: [...CARTAS],
    calledCards: calledIndexes.map((i) => CARTAS[i]!),
    cursor: calledIndexes.length,
    boards: { '111': board('111'), '222': board('222') },
    winner: null,
    winPattern: null,
    targetWinModes: ['LINE', 'CORNERS', 'FULL_BOARD'],
    scores: { '111': 0, '222': 0 },
    claimedPatterns: {},
    lastScoreAt: {},
    intervalId: null,
    createdAt: new Date(),
  });

  return roomCode;
};

beforeEach(() => {
  vi.clearAllMocks();
  transaction.mockResolvedValue([]);
  roomUpdate.mockResolvedValue({});
  GameSessionsStore.delete('ABC-123');
  gameSessionEvents.removeAllListeners();
});

describe('claimVictory con puntos', () => {
  it('da los puntos del patrón y la partida sigue en curso', async () => {
    const code = sembrarPartida(ESQUINAS);

    const resultado = await claimVictory(code, '111');

    expect(resultado.won).toBe(true);
    expect(resultado.patterns).toEqual(['CORNERS']);
    expect(resultado.points).toBe(PATTERN_POINTS.CORNERS);
    expect(resultado.gameOver).toBe(false);
    expect(resultado.scores['111']).toBe(PATTERN_POINTS.CORNERS);
    // La partida no se cerró: la sesión sigue viva.
    expect(GameSessionsStore.get(code)?.status).toBe(GameSessionStatus.PLAYING);
  });

  it('avisa a la sala que alguien se llevó un patrón', async () => {
    const code = sembrarPartida(ESQUINAS);
    const avisos: unknown[] = [];
    gameSessionEvents.on('game:pattern-claimed', (data) => avisos.push(data));

    await claimVictory(code, '111');

    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatchObject({ roomCode: code, accountNumber: '111', patterns: ['CORNERS'] });
  });

  it('el patrón se agota: el segundo jugador ya no lo puede cantar', async () => {
    const code = sembrarPartida(ESQUINAS);
    await claimVictory(code, '111');

    const resultado = await claimVictory(code, '222');

    expect(resultado.won).toBe(false);
    expect(resultado.alreadyClaimed).toBe(true);
    expect(resultado.scores['222']).toBe(0);
  });

  it('un mismo jugador puede llevarse varios patrones de un solo canto', async () => {
    const code = sembrarPartida([...ESQUINAS, ...PRIMERA_LINEA]);

    const resultado = await claimVictory(code, '111');

    expect(resultado.patterns).toEqual(['CORNERS', 'LINE']);
    expect(resultado.points).toBe(PATTERN_POINTS.CORNERS + PATTERN_POINTS.LINE);
  });

  it('la llena cierra la partida y gana quien tenga más puntos', async () => {
    const code = sembrarPartida(ESQUINAS);
    await claimVictory(code, '111');           // 111 se lleva las esquinas

    // Ahora ya se cantaron todas las cartas: 222 completa la llena.
    GameSessionsStore.get(code)!.calledCards = [...CARTAS];
    const finales: Array<{ winner: string | null; scores: Record<string, number> }> = [];
    gameSessionEvents.on('game:finished', (data) => finales.push(data));

    const resultado = await claimVictory(code, '222');

    expect(resultado.gameOver).toBe(true);
    expect(resultado.patterns).toContain('FULL_BOARD');
    expect(finales[0]?.winner).toBe('222');   // 5 puntos de la llena > 2 de las esquinas
    expect(finales[0]?.scores).toEqual({ '111': 2, '222': PATTERN_POINTS.FULL_BOARD + 1 });
    expect(GameSessionsStore.has(code)).toBe(false);
  });

  it('rechaza el canto si todavía no completa ningún patrón', async () => {
    const code = sembrarPartida([0, 1]);

    const resultado = await claimVictory(code, '111');

    expect(resultado.won).toBe(false);
    expect(resultado.alreadyClaimed).toBe(false);
    expect(resultado.points).toBe(0);
  });
});
