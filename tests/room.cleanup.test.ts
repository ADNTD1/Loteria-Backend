import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mocks de Prisma: estas pruebas no necesitan Postgres.
const { roomFindMany, roomDelete, roomUpdateMany } = vi.hoisted(() => ({
  roomFindMany: vi.fn(),
  roomDelete: vi.fn(),
  roomUpdateMany: vi.fn(),
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: class {
    user = { findUnique: vi.fn() };
    room = {
      findMany: roomFindMany,
      delete: roomDelete,
      updateMany: roomUpdateMany,
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    };
    roomPlayer = { count: vi.fn(), deleteMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() };
    $transaction = vi.fn();
  },
}));

const { limpiarSalasVacias, cerrarSalasHuerfanas, roomEvents } = await import(
  '../src/services/room.service.js'
);

beforeEach(() => {
  vi.clearAllMocks();
  roomEvents.removeAllListeners();
});

describe('limpiarSalasVacias', () => {
  it('borra las salas en espera que ya no tienen jugadores', async () => {
    roomFindMany.mockResolvedValue([{ code: 'AAA-111' }, { code: 'BBB-222' }]);
    roomDelete.mockResolvedValue({});

    const borradas = await limpiarSalasVacias();

    expect(borradas).toBe(2);
    expect(roomDelete).toHaveBeenCalledWith({ where: { code: 'AAA-111' } });
    expect(roomDelete).toHaveBeenCalledWith({ where: { code: 'BBB-222' } });
  });

  it('busca en la base, no en memoria, y solo salas vacías y viejas', async () => {
    roomFindMany.mockResolvedValue([]);

    await limpiarSalasVacias();

    const filtro = roomFindMany.mock.calls[0]![0].where;
    expect(filtro.players).toEqual({ none: {} });
    expect(filtro.createdAt.lt).toBeInstanceOf(Date);
  });

  it('también borra las terminadas: al irse el último jugador la sala queda FINISHED', async () => {
    roomFindMany.mockResolvedValue([]);

    await limpiarSalasVacias();

    const filtro = roomFindMany.mock.calls[0]![0].where;
    expect(filtro.status).toEqual({ in: ['WAITING', 'FINISHED'] });
  });

  it('avisa al lobby solo si borró algo', async () => {
    const avisos: unknown[] = [];
    roomEvents.on('rooms:changed', () => avisos.push(1));

    roomFindMany.mockResolvedValue([]);
    await limpiarSalasVacias();
    expect(avisos).toHaveLength(0);

    roomFindMany.mockResolvedValue([{ code: 'CCC-333' }]);
    roomDelete.mockResolvedValue({});
    await limpiarSalasVacias();
    expect(avisos).toHaveLength(1);
  });
});

describe('cerrarSalasHuerfanas', () => {
  it('cierra las salas que quedaron jugando tras un reinicio', async () => {
    roomUpdateMany.mockResolvedValue({ count: 3 });

    const cerradas = await cerrarSalasHuerfanas();

    expect(cerradas).toBe(3);
    expect(roomUpdateMany).toHaveBeenCalledWith({
      where: { status: 'PLAYING' },
      data: { status: 'FINISHED' },
    });
  });

  it('no avisa al lobby si no había ninguna', async () => {
    const avisos: unknown[] = [];
    roomEvents.on('rooms:changed', () => avisos.push(1));
    roomUpdateMany.mockResolvedValue({ count: 0 });

    await cerrarSalasHuerfanas();

    expect(avisos).toHaveLength(0);
  });
});
