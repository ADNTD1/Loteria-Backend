-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "roomCode" TEXT NOT NULL,
    "winnerAccount" TEXT NOT NULL,
    "totalPlayers" INTEGER NOT NULL,
    "winMode" TEXT NOT NULL DEFAULT 'FULL',
    "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_winnerAccount_fkey" FOREIGN KEY ("winnerAccount") REFERENCES "User"("accountNumber") ON DELETE RESTRICT ON UPDATE CASCADE;
