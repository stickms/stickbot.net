/*
  Warnings:

  - Added the required column `username` to the `SyncUser` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SyncUser" ADD COLUMN     "username" TEXT NOT NULL;
