/*
  Warnings:

  - A unique constraint covering the columns `[cpfNormalized]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[googleId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "customerCpf" TEXT,
ADD COLUMN     "customerUserId" TEXT;

-- AlterTable
ALTER TABLE "public"."SupportThread" ADD COLUMN     "customerCpf" TEXT,
ADD COLUMN     "customerUserId" TEXT;

-- AlterTable
ALTER TABLE "public"."Ticket" ADD COLUMN     "currentOwnerUserId" TEXT,
ADD COLUMN     "holderCpf" TEXT;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "authProvider" TEXT NOT NULL DEFAULT 'PASSWORD',
ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "cpf" TEXT,
ADD COLUMN     "cpfNormalized" TEXT,
ADD COLUMN     "cpfVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "googleId" TEXT,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Order_customerUserId_idx" ON "public"."Order"("customerUserId");

-- CreateIndex
CREATE INDEX "Order_customerEmail_idx" ON "public"."Order"("customerEmail");

-- CreateIndex
CREATE INDEX "Order_customerCpf_idx" ON "public"."Order"("customerCpf");

-- CreateIndex
CREATE INDEX "SupportThread_customerUserId_idx" ON "public"."SupportThread"("customerUserId");

-- CreateIndex
CREATE INDEX "SupportThread_customerCpf_idx" ON "public"."SupportThread"("customerCpf");

-- CreateIndex
CREATE INDEX "Ticket_currentOwnerUserId_idx" ON "public"."Ticket"("currentOwnerUserId");

-- CreateIndex
CREATE INDEX "Ticket_holderEmail_idx" ON "public"."Ticket"("holderEmail");

-- CreateIndex
CREATE INDEX "Ticket_holderCpf_idx" ON "public"."Ticket"("holderCpf");

-- CreateIndex
CREATE UNIQUE INDEX "User_cpfNormalized_key" ON "public"."User"("cpfNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "public"."User"("googleId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "public"."User"("role");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "public"."User"("status");

-- CreateIndex
CREATE INDEX "User_authProvider_idx" ON "public"."User"("authProvider");

-- CreateIndex
CREATE INDEX "User_cpf_idx" ON "public"."User"("cpf");

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ticket" ADD CONSTRAINT "Ticket_currentOwnerUserId_fkey" FOREIGN KEY ("currentOwnerUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SupportThread" ADD CONSTRAINT "SupportThread_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
