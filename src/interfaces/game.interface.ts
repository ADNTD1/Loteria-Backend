export interface Card {
  id: number,
  name: string,
  imgUrl: string
}

export interface playerBoard {
  accountNumber: string,
  cards: Card[]
}

export type Deck = Card[];
