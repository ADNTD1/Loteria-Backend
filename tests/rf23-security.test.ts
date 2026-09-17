import { describe, it, expect } from "vitest";
import { BoardOperations } from "../../src/utils/board.operations.js";
import { checkVictory } from "../../src/services/gameSession.service.js";
import type { Card, playerBoard } from "../../src/interfaces/game.interface.js";

const mockCards: Card[] = Array.from({ length: 54 }, (_, i) => ({
  id: i + 1,
  name: `Carta ${i + 1}`,
  imgUrl: `url-${i + 1}.png`
}));

describe("RF-23: Protecciones contra reclamos y eventos manipulados", () => {
  const playerBoardMock: playerBoard = {
    accountNumber: "20230001",
    cards: mockCards.slice(0, 16) // IDs del 1 al 16
  };

  it("debe rechazar reclamo si las cartas cantadas pertenecen a otro jugador pero no al tablero actual", () => {
    // Cartas cantadas que no están en el tablero del jugador (IDs 20 al 35)
    const externalCalledCards = mockCards.slice(19, 35);

    const result = BoardOperations.checkVictory(playerBoardMock, externalCalledCards);

    expect(result.won).toBe(false);
    expect(result.pattern).toBeNull();
  });

  it("debe rechazar reclamo si solo faltó una carta para completar la línea (reclamo prematuro)", () => {
    // Línea horizontal 0: índices 0, 1, 2, 3 (IDs 1, 2, 3, 4)
    // Solo salieron 1, 2 y 3 (falta la 4)
    const incompleteLineCards = [mockCards[0]!, mockCards[1]!, mockCards[2]!];

    const result = BoardOperations.checkVictory(playerBoardMock, incompleteLineCards);

    expect(result.won).toBe(false);
    expect(result.pattern).toBeNull();
  });

  it("debe rechazar victoria cuando se envían cartas inventadas que no han sido cantadas por el servidor", () => {
    // Un cliente intenta validar enviando cartas vacías o fuera del flujo del servidor
    const serverCalledCards: Card[] = []; // No ha salido ninguna carta aún

    const result = checkVictory(playerBoardMock, serverCalledCards);

    expect(result.won).toBe(false);
    expect(result.pattern).toBeNull();
  });

  it("debe ignorar cartas duplicadas en el historial del servidor y no alterar el conteo de victoria", () => {
    // Carta 1 cantada múltiples veces fraudulentamente
    const duplicateCalledCards = [mockCards[0]!, mockCards[0]!, mockCards[0]!, mockCards[0]!];

    const result = BoardOperations.checkVictory(playerBoardMock, duplicateCalledCards);

    expect(result.won).toBe(false);
    expect(result.pattern).toBeNull();
  });
});