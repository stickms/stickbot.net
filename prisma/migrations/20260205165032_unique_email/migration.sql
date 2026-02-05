/*
  Warnings:

  - A unique constraint covering the columns `[botToken]` on the table `user` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `user` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "user_email_botToken_key";

-- CreateIndex
CREATE UNIQUE INDEX "user_botToken_key" ON "user"("botToken");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");
