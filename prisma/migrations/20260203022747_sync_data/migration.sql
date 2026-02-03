/*
  Warnings:

  - You are about to drop the column `owner` on the `SyncRoom` table. All the data in the column will be lost.
  - Added the required column `ownerId` to the `SyncRoom` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SyncRoom" DROP COLUMN "owner",
ADD COLUMN     "ownerId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "SyncUser" (
    "id" TEXT NOT NULL,

    CONSTRAINT "SyncUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncMessage" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "SyncMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SyncUser_id_key" ON "SyncUser"("id");

-- CreateIndex
CREATE UNIQUE INDEX "SyncMessage_id_key" ON "SyncMessage"("id");

-- AddForeignKey
ALTER TABLE "SyncRoom" ADD CONSTRAINT "SyncRoom_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "SyncUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncMessage" ADD CONSTRAINT "SyncMessage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "SyncRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncMessage" ADD CONSTRAINT "SyncMessage_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "SyncUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
