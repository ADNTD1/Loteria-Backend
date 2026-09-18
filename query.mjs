import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const rooms = await prisma.room.findMany({
    orderBy: { createdAt: 'desc' },
    take: 2,
    include: { players: true, _count: { select: { players: true } } }
  });
  console.dir(rooms, { depth: null });
}
main().finally(() => prisma.$disconnect());
