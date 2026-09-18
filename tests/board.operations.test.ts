import { describe, it, expect, beforeEach } from 'vitest';
import { BoardOperations } from '../src/utils/board.operations.js';
import type { Card, playerBoard } from '../src/interfaces/game.interface.js';

const mockDeck: Card[] = Array.from({ length: 54 }, (_, i) => ({
  id: i + 1,
  name: `Carta ${i + 1}`,
  imgUrl: `url-${i + 1}.png`
}));

describe('BoardOperations', () => {
  describe('generateRandomBoard', () => {
    it('debería generar una tabla de exactamente 16 cartas', () => {
      const board = BoardOperations.generateRandomBoard('acc-123', mockDeck);
      expect(board.cards).toHaveLength(16);
      expect(board.accountNumber).toBe('acc-123');
    });

    it('no debería tener cartas repetidas (validación Fisher-Yates)', () => {
      const board = BoardOperations.generateRandomBoard('acc-123', mockDeck);
      const uniqueIds = new Set(board.cards.map(c => c.id));
      expect(uniqueIds.size).toBe(16);
    });

    it('debería fallar si el mazo tiene menos de 16 cartas', () => {
      expect(() => BoardOperations.generateRandomBoard('acc-123', mockDeck.slice(0, 10)))
        .toThrow('No hay suficientes cartas para generar el tablero (mínimo 16)');
    });
  });

  describe('checkVictory', () => {
    let board: playerBoard;

    beforeEach(() => {
      board = {
        accountNumber: 'test',
        cards: mockDeck.slice(0, 16) // Las primeras 16 cartas, ordenadas 0..15
      };
    });

    it('no debería ganar si no hay patrón completado', () => {
      const calledCards = [board.cards[0]!, board.cards[1]!];
      const result = BoardOperations.checkVictory(board, calledCards, ['FULL_BOARD']);
      expect(result.won).toBe(false);
      expect(result.pattern).toBe(null);
    });

    it('debería detectar patrón FULL_BOARD', () => {
      const calledCards = [...board.cards]; // Todas las 16
      const result = BoardOperations.checkVictory(board, calledCards, ['FULL_BOARD']);
      expect(result.won).toBe(true);
      expect(result.pattern).toBe('FULL_BOARD');
    });

    it('debería detectar patrón LINE (horizontal)', () => {
      // Línea 0, 1, 2, 3
      const calledCards = [board.cards[0]!, board.cards[1]!, board.cards[2]!, board.cards[3]!];
      const result = BoardOperations.checkVictory(board, calledCards, ['LINE']);
      expect(result.won).toBe(true);
      expect(result.pattern).toBe('LINE');
    });

    it('no debería ganar con línea si el modo es FULL_BOARD', () => {
      const calledCards = [board.cards[0]!, board.cards[1]!, board.cards[2]!, board.cards[3]!];
      const result = BoardOperations.checkVictory(board, calledCards, ['FULL_BOARD']);
      expect(result.won).toBe(false);
    });

    it('debería detectar patrón CORNERS (esquinas)', () => {
      // Esquinas 0, 3, 12, 15
      const calledCards = [board.cards[0]!, board.cards[3]!, board.cards[12]!, board.cards[15]!];
      const result = BoardOperations.checkVictory(board, calledCards, ['CORNERS']);
      expect(result.won).toBe(true);
      expect(result.pattern).toBe('CORNERS');
    });

    it('debería detectar patrón CENTER_2X2', () => {
      // Centro 5, 6, 9, 10
      const calledCards = [board.cards[5]!, board.cards[6]!, board.cards[9]!, board.cards[10]!];
      const result = BoardOperations.checkVictory(board, calledCards, ['CENTER_2X2']);
      expect(result.won).toBe(true);
      expect(result.pattern).toBe('CENTER_2X2');
    });

    it('debería detectar patrón SQUARE_2X2 (cuadrito en cualquier esquina)', () => {
      // Cuadrito inferior derecho 10, 11, 14, 15
      const calledCards = [board.cards[10]!, board.cards[11]!, board.cards[14]!, board.cards[15]!];
      const result = BoardOperations.checkVictory(board, calledCards, ['SQUARE_2X2']);
      expect(result.won).toBe(true);
      expect(result.pattern).toBe('SQUARE_2X2');
    });

    it('gana con cualquiera de los modos habilitados', () => {
      const calledCards = [board.cards[0]!, board.cards[1]!, board.cards[2]!, board.cards[3]!];
      const result = BoardOperations.checkVictory(board, calledCards, ['CORNERS', 'LINE']);
      expect(result.won).toBe(true);
      expect(result.pattern).toBe('LINE');
    });

    it('reporta FULL_BOARD si se cumple junto a otros patrones', () => {
      const calledCards = [...board.cards];
      const result = BoardOperations.checkVictory(board, calledCards, ['LINE', 'FULL_BOARD']);
      expect(result.won).toBe(true);
      expect(result.pattern).toBe('FULL_BOARD');
    });

    it('no gana si el modo habilitado es desconocido', () => {
      const calledCards = [...board.cards];
      const result = BoardOperations.checkVictory(board, calledCards, ['MODO_INVENTADO']);
      expect(result.won).toBe(false);
      expect(result.pattern).toBe(null);
    });
  });

  describe('patrones independientes', () => {
    let board: playerBoard;

    // Tabla 4x4 con las casillas numeradas 0..15 de izquierda a derecha.
    const marcar = (...indices: number[]) => indices.map((i) => board.cards[i]!);

    beforeEach(() => {
      board = { accountNumber: 'test', cards: mockDeck.slice(0, 16) };
    });

    it('el chorro NO se completa con una diagonal', () => {
      const diagonal = marcar(0, 5, 10, 15);
      expect(BoardOperations.completedPatterns(board, diagonal, ['LINE'])).toEqual([]);
    });

    it('la diagonal es su propio patrón, en cualquiera de las dos', () => {
      expect(BoardOperations.completedPatterns(board, marcar(0, 5, 10, 15), ['DIAGONAL']))
        .toEqual(['DIAGONAL']);
      expect(BoardOperations.completedPatterns(board, marcar(3, 6, 9, 12), ['DIAGONAL']))
        .toEqual(['DIAGONAL']);
    });

    it('la equis pide las dos diagonales completas', () => {
      const soloUna = marcar(0, 5, 10, 15);
      expect(BoardOperations.completedPatterns(board, soloUna, ['EQUIS'])).toEqual([]);

      const ambas = marcar(0, 5, 10, 15, 3, 6, 9, 12);
      expect(BoardOperations.completedPatterns(board, ambas, ['EQUIS'])).toEqual(['EQUIS']);
    });

    it('la escuadra vale en cualquiera de las cuatro esquinas', () => {
      const superiorIzquierda = marcar(0, 1, 2, 3, 4, 8, 12);
      const inferiorDerecha = marcar(12, 13, 14, 15, 3, 7, 11);

      expect(BoardOperations.completedPatterns(board, superiorIzquierda, ['ESCUADRA']))
        .toEqual(['ESCUADRA']);
      expect(BoardOperations.completedPatterns(board, inferiorDerecha, ['ESCUADRA']))
        .toEqual(['ESCUADRA']);
    });

    it('el cuadrito vale en cualquier posición, pero es un solo patrón', () => {
      const esquina = marcar(0, 1, 4, 5);
      const centro = marcar(5, 6, 9, 10);

      expect(BoardOperations.completedPatterns(board, esquina, ['SQUARE_2X2']))
        .toEqual(['SQUARE_2X2']);
      expect(BoardOperations.completedPatterns(board, centro, ['SQUARE_2X2']))
        .toEqual(['SQUARE_2X2']);
    });

    it('una equis también completa diagonal, y son dos patrones distintos', () => {
      const equis = marcar(0, 5, 10, 15, 3, 6, 9, 12);
      const completados = BoardOperations.completedPatterns(board, equis, ['EQUIS', 'DIAGONAL', 'LINE']);

      expect(completados).toContain('EQUIS');
      expect(completados).toContain('DIAGONAL');
      expect(completados).not.toContain('LINE');
    });

    it('devuelve los patrones de mayor a menor valor', () => {
      const escuadra = marcar(0, 1, 2, 3, 4, 8, 12);
      const completados = BoardOperations.completedPatterns(board, escuadra, ['LINE', 'ESCUADRA']);

      expect(completados).toEqual(['ESCUADRA', 'LINE']); // la fila 0-3 también es chorro
    });
  });
});
