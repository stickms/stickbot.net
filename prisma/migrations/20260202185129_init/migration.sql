-- CreateTable
CREATE TABLE "SyncRoom" (
    "id" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "queue" TEXT[],

    CONSTRAINT "SyncRoom_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SyncRoom_id_key" ON "SyncRoom"("id");
