import { afterEach, describe, expect, it, vi } from "vitest";
import { shuffleDeck } from "../../src/utils/suffle-deck.js";
import { makeCards } from "../helpers/cards.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("shuffleDeck", () => {
  it("conserva exactamente las mismas cartas", () => {
    const deck = makeCards(54);

    const shuffled = shuffleDeck(deck);

    expect(shuffled).toHaveLength(54);
    expect(shuffled).toEqual(expect.arrayContaining(deck));
  });

  it("no modifica el mazo original", () => {
    const deck = makeCards(54);
    const original = [...deck];

    const shuffled = shuffleDeck(deck);

    expect(shuffled).not.toBe(deck);
    expect(deck).toEqual(original);
  });

  it("cambia el orden de las cartas", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const deck = makeCards(4);

    const shuffled = shuffleDeck(deck);

    expect(shuffled.map((card) => card.id)).not.toEqual([1, 2, 3, 4]);
  });

  it("funciona con mazos vacíos o de una carta", () => {
    expect(shuffleDeck([])).toEqual([]);
    expect(shuffleDeck(makeCards(1))).toEqual(makeCards(1));
  });
});