/*
  Warnings:

  - A unique constraint covering the columns `[email,botToken]` on the table `user` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "user_email_key";

-- CreateIndex
CREATE UNIQUE INDEX "user_email_botToken_key" ON "user"("email", "botToken");
