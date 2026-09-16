const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = shuffled[i];
        shuffled[i] = shuffled[j];
        shuffled[j] = temp;
    }
    return shuffled;
};
export const generateRandomBoard = (accountNumber, allCards) => {
    if (allCards.length < 16) {
        throw new Error("No hay suficientes cartas para generar el tablero");
    }
    const selectedCards = shuffleArray(allCards).slice(0, 16);
    return {
        accountNumber,
        cards: selectedCards
    };
};
//# sourceMappingURL=generateRandomBoard.js.map