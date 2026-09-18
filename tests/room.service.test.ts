import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mocks del cliente de Prisma: estas pruebas no necesitan Postgres.
const {
  userFindUnique,
  roomFindUnique,
  roomFindMany,
  roomCreate,
  roomDelete,
  roomPlayerCreate,
  roomPlayerFindFirst,
  roomPlayerCount,
  roomPlayerDeleteMany,
  transaction,
} = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  roomFindUnique: vi.fn(),
  roomFindMany: vi.fn(),
  roomCreate: vi.fn(),
  roomDelete: vi.fn(),
  roomPlayerCreate: vi.fn(),
  roomPlayerFindFirst: vi.fn(),
  roomPlayerCount: vi.fn(),
  roomPlayerDeleteMany: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: class {
    user = { findUnique: userFindUnique };
    room = {
      findUnique: roomFindUnique,
      findMany: roomFindMany,
      create: roomCreate,
      delete: roomDelete,
    };
    roomPlayer = {
      create: roomPlayerCreate,
      findFirst: roomPlayerFindFirst,
      count: roomPlayerCount,
      deleteMany: roomPlayerDeleteMany,
    };
    $transaction = transaction;
  },
}));

import {
  createRoom,
  joinRoom,
  leaveRoom,
  getAvailableRooms,
  assertRoomHost,
  RoomError,
  roomEvents,
} from '../src/services/room.service.js';
import { AliasesStore } from '../src/state/aliases.store.js';

const host = { id: 'user-1', accountNumber: 'host-1', name: 'Host' };
const guest = { id: 'user-2', accountNumber: 'guest-1', name: 'Guest' };

const baseRoom = {
  id: 'room-1',
  hostAccountNumber: host.accountNumber,
  code: 'ABC-123',
  name: 'La Cantina',
  status: 'WAITING',
  maxPlayers: 4,
  createdAt: new Date(),
  _count: { players: 1 },
};

beforeEach(() => {
  vi.clearAllMocks();
  AliasesStore.clearRoom('ABC-123');
  roomEvents.removeAllListeners();

  // $transaction ejecuta el callback con el propio cliente mockeado como tx
  transaction.mockImplementation(async (cb: any) =>
    cb({ room: { create: roomCreate }, roomPlayer: { create: roomPlayerCreate } })
  );
});

describe('createRoom', () => {
  it('crea la sala con nombre validado y registra al host', async () => {
    userFindUnique.mockResolvedValue(host);
    roomFindUnique.mockResolvedValue(null); // código libre
    roomCreate.mockResolvedValue(baseRoom);
    roomPlayerCreate.mockResolvedValue({});

    const events: string[] = [];
    roomEvents.on('rooms:changed', () => events.push('rooms:changed'));

    const room = await createRoom(host.accountNumber, 'La Cantina', 4, 'ElHost');

    expect(roomCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'La Cantina', maxPlayers: 4, status: 'WAITING' }),
      })
    );
    expect(roomPlayerCreate).toHaveBeenCalled();

    // El código se genera aleatorio; lo capturamos de lo que se guardó en BD.
    const generatedCode = roomCreate.mock.calls[0]![0].data.code as string;
    expect(generatedCode).toMatch(/^[A-Z]{3}-[A-Z0-9]{3}$/);
    expect(AliasesStore.get(generatedCode, host.accountNumber)).toBe('ElHost');
    AliasesStore.clearRoom(generatedCode);
    expect(events).toContain('rooms:changed');
  });

  it('rechaza un nombre inválido', async () => {
    await expect(createRoom(host.accountNumber, 'x', 4)).rejects.toThrow(RoomError);
    await expect(createRoom(host.accountNumber, 123, 4)).rejects.toThrow(RoomError);
  });

  it('rechaza maxPlayers menor a 2', async () => {
    await expect(createRoom(host.accountNumber, 'La Cantina', 1)).rejects.toThrow(
      'La sala debe permitir al menos 2 jugadores'
    );
  });

  it('falla si el host no existe', async () => {
    userFindUnique.mockResolvedValue(null);
    await expect(createRoom('nadie', 'La Cantina', 4)).rejects.toThrow('El usuario no existe');
  });
});

describe('joinRoom', () => {
  it('une al jugador y emite los eventos de actualización', async () => {
    userFindUnique.mockResolvedValue(guest);
    roomFindUnique.mockResolvedValue(baseRoom);
    roomPlayerFindFirst.mockResolvedValue(null);
    roomPlayerCreate.mockResolvedValue({});

    const events: string[] = [];
    roomEvents.on('rooms:changed', () => events.push('rooms:changed'));
    roomEvents.on('room:playersChanged', () => events.push('room:playersChanged'));

    const result = await joinRoom(guest.accountNumber, 'ABC-123', 'Beto');

    expect(result.alreadyJoined).toBe(false);
    expect(roomPlayerCreate).toHaveBeenCalled();
    expect(AliasesStore.get('ABC-123', guest.accountNumber)).toBe('Beto');
    expect(events).toEqual(['rooms:changed', 'room:playersChanged']);
  });

  it('es idempotente si el jugador ya pertenece a la sala', async () => {
    userFindUnique.mockResolvedValue(guest);
    roomFindUnique.mockResolvedValue(baseRoom);
    roomPlayerFindFirst.mockResolvedValue({ id: 'rp-1' });

    const result = await joinRoom(guest.accountNumber, 'ABC-123', 'Beto');

    expect(result.alreadyJoined).toBe(true);
    expect(roomPlayerCreate).not.toHaveBeenCalled();
  });

  it('rechaza salas que no existen', async () => {
    userFindUnique.mockResolvedValue(guest);
    roomFindUnique.mockResolvedValue(null);

    await expect(joinRoom(guest.accountNumber, 'XXX-000', 'Beto')).rejects.toThrow(
      'La sala especificada no fue encontrada'
    );
  });

  it('rechaza unirse a una partida en curso', async () => {
    userFindUnique.mockResolvedValue(guest);
    roomFindUnique.mockResolvedValue({ ...baseRoom, status: 'PLAYING' });

    await expect(joinRoom(guest.accountNumber, 'ABC-123', 'Beto')).rejects.toThrow(
      'La partida de la sala ya comenzó'
    );
  });

  it('rechaza una sala llena', async () => {
    userFindUnique.mockResolvedValue(guest);
    roomFindUnique.mockResolvedValue({ ...baseRoom, _count: { players: 4 } });
    roomPlayerFindFirst.mockResolvedValue(null);

    await expect(joinRoom(guest.accountNumber, 'ABC-123', 'Beto')).rejects.toThrow(
      'La sala está llena'
    );
  });

  it('rechaza un alias ya tomado por otro jugador', async () => {
    AliasesStore.set('ABC-123', host.accountNumber, 'Beto');

    userFindUnique.mockResolvedValue(guest);
    roomFindUnique.mockResolvedValue(baseRoom);
    roomPlayerFindFirst.mockResolvedValue(null);

    await expect(joinRoom(guest.accountNumber, 'ABC-123', 'beto')).rejects.toThrow(
      'ya está en uso en esta sala'
    );
  });
});

describe('leaveRoom', () => {
  it('saca al jugador y libera su alias', async () => {
    AliasesStore.set('ABC-123', guest.accountNumber, 'Beto');

    roomFindUnique.mockResolvedValue(baseRoom);
    userFindUnique.mockResolvedValue(guest);
    roomPlayerDeleteMany.mockResolvedValue({ count: 1 });
    roomPlayerCount.mockResolvedValue(1); // aún queda el host

    await leaveRoom(guest.accountNumber, 'ABC-123');

    expect(roomPlayerDeleteMany).toHaveBeenCalled();
    expect(AliasesStore.get('ABC-123', guest.accountNumber)).toBeUndefined();
  });

  it('no deja salir de una partida en curso', async () => {
    roomFindUnique.mockResolvedValue({ ...baseRoom, status: 'PLAYING' });

    await expect(leaveRoom(guest.accountNumber, 'ABC-123')).rejects.toThrow(
      'No se puede abandonar una partida en curso'
    );
  });
});

describe('getAvailableRooms', () => {
  it('devuelve solo salas WAITING como resumen público', async () => {
    roomFindMany.mockResolvedValue([baseRoom]);

    const rooms = await getAvailableRooms();

    expect(roomFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'WAITING' } })
    );
    expect(rooms).toEqual([
      {
        code: 'ABC-123',
        name: 'La Cantina',
        hostAccountNumber: host.accountNumber,
        players: 1,
        maxPlayers: 4,
      },
    ]);
  });
});

describe('assertRoomHost', () => {
  it('pasa si es el host', async () => {
    roomFindUnique.mockResolvedValue(baseRoom);
    await expect(assertRoomHost('ABC-123', host.accountNumber)).resolves.toEqual(baseRoom);
  });

  it('rechaza a quien no es host', async () => {
    roomFindUnique.mockResolvedValue(baseRoom);
    await expect(assertRoomHost('ABC-123', guest.accountNumber)).rejects.toThrow(
      'Sólo el host puede realizar esta acción'
    );
  });

  it('falla si la sala no existe', async () => {
    roomFindUnique.mockResolvedValue(null);
    await expect(assertRoomHost('XXX-000', host.accountNumber)).rejects.toThrow(
      'La sala no existe'
    );
  });
});
