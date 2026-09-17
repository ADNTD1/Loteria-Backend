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
      const result = BoardOperations.checkVictory(board, calledCards);
      expect(result.won).toBe(false);
      expect(result.pattern).toBe(null);
    });

    it('debería detectar patrón FULL_BOARD', () => {
      const calledCards = [...board.cards]; // Todas las 16
      const result = BoardOperations.checkVictory(board, calledCards);
      expect(result.won).toBe(true);
      expect(result.pattern).toBe('FULL_BOARD');
    });

    it('debería detectar patrón LINE (horizontal)', () => {
      // Línea 0, 1, 2, 3
      const calledCards = [board.cards[0]!, board.cards[1]!, board.cards[2]!, board.cards[3]!];
      const result = BoardOperations.checkVictory(board, calledCards);
      expect(result.won).toBe(true);
      expect(result.pattern).toBe('LINE');
    });

    it('debería detectar patrón CORNERS (esquinas)', () => {
      // Esquinas 0, 3, 12, 15
      const calledCards = [board.cards[0]!, board.cards[3]!, board.cards[12]!, board.cards[15]!];
      const result = BoardOperations.checkVictory(board, calledCards);
      expect(result.won).toBe(true);
      expect(result.pattern).toBe('CORNERS');
    });
  });
});
