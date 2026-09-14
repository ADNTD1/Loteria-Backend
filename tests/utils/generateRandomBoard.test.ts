import { describe, expect, it } from "vitest";
import { generateRandomBoard } from "../../src/utils/generateRandomBoard.js";
import { makeCards } from "../helpers/cards.js";

describe("generateRandomBoard", () => {
  it("genera una tabla de 16 cartas distintas tomadas del mazo", () => {
    const deck = makeCards(54);

    const board = generateRandomBoard("20000111", deck);

    const ids = board.cards.map((card) => card.id);
    expect(board.accountNumber).toBe("20000111");
    expect(ids).toHaveLength(16);
    expect(new Set(ids).size).toBe(16);
    expect(deck).toEqual(expect.arrayContaining(board.cards));
  });

  it("usa todas las cartas cuando el mazo tiene exactamente 16", () => {
    const deck = makeCards(16);

    const board = generateRandomBoard("20000111", deck);

    expect(board.cards).toHaveLength(16);
    expect(board.cards).toEqual(expect.arrayContaining(deck));
  });

  it("lanza un error si hay menos de 16 cartas", () => {
    expect(() => generateRandomBoard("20000111", makeCards(15))).toThrow(
      "No hay suficientes cartas para generar el tablero"
    );
  });

  it("no modifica el mazo original", () => {
    const deck = makeCards(54);
    const original = [...deck];

    generateRandomBoard("20000111", deck);

    expect(deck).toEqual(original);
  });
});