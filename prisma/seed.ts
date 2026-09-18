/// <reference types="node" />
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Orden oficial 1-54 de la Lotería Mexicana, alineado con los archivos
// de la carpeta "Cartas de Lotería Mexicana del 1 al 54 [GRATIS]".
// imgUrl asume que las imágenes viven en /public/cards y se sirven
// como estáticas desde Express (ver instrucciones en app.ts).
const CARD_NAMES = [
  "El Gallo", "El Diablito", "La Dama", "El Catrín", "El Paraguas",
  "La Sirena", "La Escalera", "La Botella", "El Barril", "El Árbol",
  "El Melón", "El Valiente", "El Gorrito", "La Muerte", "La Pera",
  "La Bandera", "El Bandolón", "El Violoncello", "La Garza", "El Pájaro",
  "La Mano", "La Bota", "La Luna", "El Cotorro", "El Borracho",
  "El Negrito", "El Corazón", "La Sandía", "El Tambor", "El Camarón",
  "Las Jaras", "El Músico", "La Araña", "El Soldado", "La Estrella",
  "El Cazo", "El Mundo", "El Apache", "El Nopal", "El Alacrán",
  "La Rosa", "La Calavera", "La Campana", "El Cantarito", "El Venado",
  "El Sol", "La Corona", "La Chalupa", "El Pino", "El Pescado",
  "La Palma", "La Maceta", "El Arpa", "La Rana"
];

async function main() {
  const cards = CARD_NAMES.map((name, index) => ({
    id: index + 1,
    name,
    imgUrl: `${index + 1}.webp`,
  }));

  for (const card of cards) {
    await prisma.card.upsert({
      where: { id: card.id },
      update: { name: card.name, imgUrl: card.imgUrl },
      create: card,
    });
  }

  console.log(`Seed listo: ${cards.length} cartas cargadas.`);
}

main()
  .catch((e) => {
    console.error("Error en el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
