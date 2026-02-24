/*
  Warnings:

  - You are about to drop the column `queue` on the `SyncRoom` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SyncRoom" DROP COLUMN "queue";

-- CreateTable
CREATE TABLE "SyncMedia" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,

    CONSTRAINT "SyncMedia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SyncMedia_id_key" ON "SyncMedia"("id");

-- AddForeignKey
ALTER TABLE "SyncMedia" ADD CONSTRAINT "SyncMedia_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "SyncUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncMedia" ADD CONSTRAINT "SyncMedia_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "SyncRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
