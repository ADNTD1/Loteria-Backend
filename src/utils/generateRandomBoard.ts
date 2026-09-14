import type { Card, playerBoard} from "../interfaces/game.interface.ts";

const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled: T[] = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp: T = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }
  return shuffled;
};


export const generateRandomBoard = (accountNumber: string, allCards: Card[]): playerBoard => {
  if (allCards.length < 16) {
    throw new Error("No hay suficientes cartas para generar el tablero");
  }

  const selectedCards = shuffleArray(allCards).slice(0, 16);

  return {
    accountNumber,
    cards: selectedCards
  };
};
