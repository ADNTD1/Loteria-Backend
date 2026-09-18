/// <reference types="node" />
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Usuarios de prueba SOLO para desarrollo local, para poder probar
// createRoom / joinRoom / login sin depender de un sistema externo
// de altas. NO usar estos accountNumber en producción.
const TEST_USERS = [
  { accountNumber: "2023001", name: "Jugador Uno" },
  { accountNumber: "2023002", name: "Jugador Dos" },
  { accountNumber: "2023003", name: "Jugador Tres" },
  { accountNumber: "2023004", name: "Jugador Cuatro" },
];

async function main() {
  for (const u of TEST_USERS) {
    await prisma.user.upsert({
      where: { accountNumber: u.accountNumber },
      update: { name: u.name },
      create: u,
    });
  }

  console.log(`Seed listo: ${TEST_USERS.length} usuarios de prueba cargados.`);
}

main()
  .catch((e) => {
    console.error("Error en el seed de usuarios:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });