import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
export class CardRepository {
    async findAll() {
        return await prisma.card.findMany({
            orderBy: {
                id: "asc"
            }
        });
    }
}
//# sourceMappingURL=card.repository.js.map