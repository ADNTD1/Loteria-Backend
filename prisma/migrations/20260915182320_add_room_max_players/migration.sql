/*
  Warnings:

  - Added the required column `maxPlayers` to the `Room` table without a default value. This is not possible if the table is not empty.

*/
-- Add maxPlayers as nullable first
ALTER TABLE "Room"
ADD COLUMN "maxPlayers" INTEGER;

-- Give existing rooms a temporary capacity
UPDATE "Room"
SET "maxPlayers" = 4
WHERE "maxPlayers" IS NULL;

-- Make maxPlayers required
ALTER TABLE "Room"
ALTER COLUMN "maxPlayers" SET NOT NULL;