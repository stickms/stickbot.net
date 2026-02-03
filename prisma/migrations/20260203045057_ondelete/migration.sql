-- DropForeignKey
ALTER TABLE "SyncMessage" DROP CONSTRAINT "SyncMessage_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "SyncMessage" DROP CONSTRAINT "SyncMessage_roomId_fkey";

-- DropForeignKey
ALTER TABLE "SyncRoom" DROP CONSTRAINT "SyncRoom_ownerId_fkey";

-- AddForeignKey
ALTER TABLE "SyncRoom" ADD CONSTRAINT "SyncRoom_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "SyncUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncMessage" ADD CONSTRAINT "SyncMessage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "SyncRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncMessage" ADD CONSTRAINT "SyncMessage_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "SyncUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
