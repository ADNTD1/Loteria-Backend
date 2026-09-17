import type { Card, playerBoard } from "../interfaces/game.interface.js";
import type { WinPattern } from "../interfaces/gameSession.interface.js";

export class BoardOperations {
  /**
   * Genera una tabla aleatoria de 16 cartas sin repetición.
   * Utiliza el algoritmo de Fisher-Yates para asegurar O(N) y cero duplicados.
   */
    /** Tamaño oficial de una tabla de Lotería (4x4). */
  public static readonly BOARD_SIZE = 16;
  public static generateRandomBoard(accountNumber: string, allCards: Card[]): playerBoard {
    if (allCards.length < BoardOperations.BOARD_SIZE) {
      throw new Error("No hay suficientes cartas para generar el tablero (mínimo 16)");
    }

   const shuffled = [...allCards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffled[i] as Card;      // <- antes: [shuffled[i], shuffled[j]] = ...
      shuffled[i] = shuffled[j] as Card;     //    eso daba error TS2322
      shuffled[j] = temp;
    }

    return {
      accountNumber,
      cards: shuffled.slice(0, BoardOperations.BOARD_SIZE)
    };
  }
  /**
   * RF-04 / RF-05: una tabla es válida si tiene exactamente 16 cartas
   * y ninguna se repite dentro de ella.
   */
  public static isValidBoard(board: playerBoard | undefined | null): boolean {
    if (!board || !Array.isArray(board.cards)) return false;
    if (board.cards.length !== BoardOperations.BOARD_SIZE) return false;

    const uniqueIds = new Set(board.cards.map((c) => c.id));
    return uniqueIds.size === BoardOperations.BOARD_SIZE;
  }
  /**
   * Verifica qué cartas de la tabla están marcadas (salieron).
   * @returns Un array de booleanos de longitud 16, donde true indica que fue cantada.
   */
  public static getMarks(board: playerBoard, calledCards: Card[]): boolean[] {
    const calledIds = new Set(calledCards.map((c) => c.id));
    return board.cards.map((c) => calledIds.has(c.id));
  }

  /**
   * Valida si un tablero cumple alguna condición de victoria.
   * Separa la lógica pura del dominio del servicio de estado (gameSession).
   */
  public static checkVictory(
    board: playerBoard,
    calledCards: Card[]
  ): { won: boolean; pattern: WinPattern | null } {
    const marks = this.getMarks(board, calledCards);

    const isLineComplete = (indexes: number[]) => indexes.every((i) => marks[i]);

    const lines: number[][] = [
      [0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], [12, 13, 14, 15], // Horizontales
      [0, 4, 8, 12], [1, 5, 9, 13], [2, 6, 10, 14], [3, 7, 11, 15], // Verticales
      [0, 5, 10, 15], [3, 6, 9, 12], // Diagonales
    ];

    const corners: number[] = [0, 3, 12, 15];

    if (marks.every(Boolean)) {
      return { won: true, pattern: "FULL_BOARD" };
    }

    if (isLineComplete(corners)) {
      return { won: true, pattern: "CORNERS" };
    }

    if (lines.some(isLineComplete)) {
      return { won: true, pattern: "LINE" };
    }

    return { won: false, pattern: null };
  }
}
