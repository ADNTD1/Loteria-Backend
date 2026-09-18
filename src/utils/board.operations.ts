import type { Card, playerBoard } from "../interfaces/game.interface.js";
import type { WinPattern } from "../interfaces/gameSession.interface.js";

export class BoardOperations {
  /** Tamaño oficial de una tabla de Lotería (4x4). */
  public static readonly BOARD_SIZE = 16
  /**
   * Genera una tabla aleatoria de 16 cartas sin repetición.
   * Utiliza el algoritmo de Fisher-Yates para asegurar O(N) y cero duplicados.
   */
  public static generateRandomBoard(accountNumber: string, allCards: Card[]): playerBoard {
        if (allCards.length < BoardOperations.BOARD_SIZE) {
      throw new Error("No hay suficientes cartas para generar el tablero (mínimo 16)");
    }

    const shuffled = [...allCards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffled[i]!;
      shuffled[i] = shuffled[j]!;
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
   * Valida si un tablero cumple ALGUNA de las condiciones de victoria
   * habilitadas para la sala. Si cumple varias, se reporta la más "alta"
   * según el orden de prioridad (el cartón lleno es lo más fuerte).
   */
  public static checkVictory(
    board: playerBoard,
    calledCards: Card[],
    targetWinModes: string[]
  ): { won: boolean; pattern: WinPattern | null } {
    const marks = this.getMarks(board, calledCards);

    const isLineComplete = (indexes: number[]) => indexes.every((i) => marks[i]);

    const lines: number[][] = [
      [0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], [12, 13, 14, 15], // Horizontales
      [0, 4, 8, 12], [1, 5, 9, 13], [2, 6, 10, 14], [3, 7, 11, 15], // Verticales
      [0, 5, 10, 15], [3, 6, 9, 12], // Diagonales
    ];

    const corners: number[] = [0, 3, 12, 15];
    const center2x2: number[] = [5, 6, 9, 10];
    const square2x2: number[][] = [
      [0, 1, 4, 5], [1, 2, 5, 6], [2, 3, 6, 7],
      [4, 5, 8, 9], [5, 6, 9, 10], [6, 7, 10, 11],
      [8, 9, 12, 13], [9, 10, 13, 14], [10, 11, 14, 15]
    ];

    const checks: Record<string, () => boolean> = {
      LINE: () => lines.some(isLineComplete),
      CORNERS: () => isLineComplete(corners),
      CENTER_2X2: () => isLineComplete(center2x2),
      SQUARE_2X2: () => square2x2.some(isLineComplete),
      FULL_BOARD: () => marks.every(Boolean),
    };

    const enabled = new Set(targetWinModes);
    const priority: WinPattern[] = ["FULL_BOARD", "CENTER_2X2", "SQUARE_2X2", "CORNERS", "LINE"];

    for (const pattern of priority) {
      if (enabled.has(pattern) && checks[pattern]!()) {
        return { won: true, pattern };
      }
    }

    return { won: false, pattern: null };
  }
}
