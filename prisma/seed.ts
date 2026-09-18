// Seed idempotente para desarrollo: usuarios de prueba y las 54 cartas
// de la Lotería Mexicana. Ejecutar con: npx tsx prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const NOMBRES_CARTAS = [
  'El Gallo', 'El Diablito', 'La Dama', 'El Catrín', 'El Paraguas', 'La Sirena',
  'La Escalera', 'La Botella', 'El Barril', 'El Árbol', 'El Melón', 'El Valiente',
  'El Gorrito', 'La Muerte', 'La Pera', 'La Bandera', 'El Bandolón', 'El Violoncello',
  'La Garza', 'El Pájaro', 'La Mano', 'La Bota', 'La Luna', 'El Cotorro',
  'El Borracho', 'El Negrito', 'El Corazón', 'La Sandía', 'El Tambor', 'El Camarón',
  'Las Jaras', 'El Músico', 'La Araña', 'El Soldado', 'La Estrella', 'El Cazo',
  'El Mundo', 'El Apache', 'El Nopal', 'El Alacrán', 'La Rosa', 'La Calavera',
  'La Campana', 'El Cantarito', 'El Venado', 'El Sol', 'La Corona', 'La Chalupa',
  'El Pino', 'El Pescado', 'La Palma', 'La Maceta', 'El Arpa', 'La Rana',
];

const USUARIOS_PRUEBA = [
  { accountNumber: '20230001', name: 'Jugador Uno' },
  { accountNumber: '20230002', name: 'Jugador Dos' },
  { accountNumber: '20230003', name: 'Jugador Tres' },
  { accountNumber: '20230004', name: 'Jugador Cuatro' },
];

async function main() {
  for (const usuario of USUARIOS_PRUEBA) {
    await prisma.user.upsert({
      where: { accountNumber: usuario.accountNumber },
      update: {},
      create: usuario,
    });
    console.log(`Usuario listo: ${usuario.accountNumber} (${usuario.name})`);
  }

  for (let i = 0; i < NOMBRES_CARTAS.length; i++) {
    const id = i + 1;
    await prisma.card.upsert({
      where: { id },
      update: { name: NOMBRES_CARTAS[i], imgUrl: `/cards/${id}.webp` },
      create: { id, name: NOMBRES_CARTAS[i], imgUrl: `/cards/${id}.webp` },
    });
  }
  console.log(`Cartas listas: ${NOMBRES_CARTAS.length}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error('Error en el seed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
