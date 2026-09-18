import { describe, it, expect, beforeEach } from "vitest";
import { RoomBoardsStore } from "../src/state/roomBoards.store.js";
import { BoardOperations } from "../src/utils/board.operations.js";
import { makeCards } from "./helpers/cards.js";

const CARDS = makeCards(54);

describe("RF-04 / RF-05: asignación de tablas al unirse a la sala", () => {
  beforeEach(() => {
    RoomBoardsStore.clear("ABC123");
    RoomBoardsStore.clear("XYZ789");
  });

  it("una tabla generada es válida: 16 cartas y sin repetidas", () => {
    const board = BoardOperations.generateRandomBoard("2023001", CARDS);

    expect(board.cards).toHaveLength(16);
    expect(BoardOperations.isValidBoard(board)).toBe(true);
  });

  it("isValidBoard rechaza tablas con cartas repetidas o tamaño incorrecto", () => {
    const repetida = {
      accountNumber: "2023001",
      cards: Array.from({ length: 16 }, () => CARDS[0]!)
    };
    const corta = { accountNumber: "2023001", cards: CARDS.slice(0, 10) };

    expect(BoardOperations.isValidBoard(repetida)).toBe(false);
    expect(BoardOperations.isValidBoard(corta)).toBe(false);
    expect(BoardOperations.isValidBoard(undefined)).toBe(false);
  });

  it("guarda y recupera la tabla de un jugador por sala", () => {
    const board = BoardOperations.generateRandomBoard("2023001", CARDS);
    RoomBoardsStore.set("ABC123", "2023001", board);

    expect(RoomBoardsStore.has("ABC123", "2023001")).toBe(true);
    expect(RoomBoardsStore.get("ABC123", "2023001")).toEqual(board);
    expect(RoomBoardsStore.count("ABC123")).toBe(1);
  });

  it("no mezcla las tablas entre salas distintas (RF-24)", () => {
    RoomBoardsStore.set("ABC123", "2023001", BoardOperations.generateRandomBoard("2023001", CARDS));
    RoomBoardsStore.set("XYZ789", "2023002", BoardOperations.generateRandomBoard("2023002", CARDS));

    expect(RoomBoardsStore.has("ABC123", "2023002")).toBe(false);
    expect(RoomBoardsStore.count("XYZ789")).toBe(1);
  });

  it("cada jugador recibe una tabla distinta (no la misma combinación)", () => {
    const a = BoardOperations.generateRandomBoard("2023001", CARDS);
    const b = BoardOperations.generateRandomBoard("2023002", CARDS);

    const idsA = a.cards.map((c) => c.id).join(",");
    const idsB = b.cards.map((c) => c.id).join(",");

    expect(idsA).not.toBe(idsB);
  });

  it("clear() limpia las tablas para una nueva partida (RF-17)", () => {
    RoomBoardsStore.set("ABC123", "2023001", BoardOperations.generateRandomBoard("2023001", CARDS));
    RoomBoardsStore.clear("ABC123");

    expect(RoomBoardsStore.count("ABC123")).toBe(0);
    expect(RoomBoardsStore.getAll("ABC123")).toEqual({});
  });
});