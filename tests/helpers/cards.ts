import type { Card } from "@prisma/client";

export const makeCards = (count: number): Card[] =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Carta ${i + 1}`,
    imgUrl: `/assets/loteria/${i + 1}.webp`
  }));