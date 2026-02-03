/*
  Warnings:

  - Added the required column `name` to the `SyncRoom` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SyncRoom" ADD COLUMN     "name" TEXT NOT NULL;
