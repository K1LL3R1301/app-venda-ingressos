/*
  Warnings:

  - The `category` column on the `Event` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."EventCollection" AS ENUM ('FESTAS_SHOWS', 'TEATROS_ESPETACULOS', 'STAND_UP_COMEDY', 'ESPORTES', 'PASSEIOS_TOURS', 'CONGRESSOS', 'INFANTIL', 'GASTRONOMIA');

-- AlterTable
ALTER TABLE "public"."Event" DROP COLUMN "category",
ADD COLUMN     "category" "public"."EventCollection";

-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "expiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."Ticket" ADD COLUMN     "receivedViaTransferLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "receivedViaTransferRequestId" TEXT;

-- AlterTable
ALTER TABLE "public"."TicketTransferRequest" ADD COLUMN     "mode" TEXT NOT NULL DEFAULT 'FORWARD',
ADD COLUMN     "returnOfTransferRequestId" TEXT;

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "public"."Order"("status");

-- CreateIndex
CREATE INDEX "Order_expiresAt_idx" ON "public"."Order"("expiresAt");

-- CreateIndex
CREATE INDEX "Ticket_receivedViaTransferRequestId_idx" ON "public"."Ticket"("receivedViaTransferRequestId");

-- CreateIndex
CREATE INDEX "Ticket_receivedViaTransferLocked_idx" ON "public"."Ticket"("receivedViaTransferLocked");

-- CreateIndex
CREATE INDEX "TicketTransferRequest_mode_idx" ON "public"."TicketTransferRequest"("mode");

-- CreateIndex
CREATE INDEX "TicketTransferRequest_returnOfTransferRequestId_idx" ON "public"."TicketTransferRequest"("returnOfTransferRequestId");

-- CreateIndex
CREATE INDEX "TicketTransferRequest_expiresAt_idx" ON "public"."TicketTransferRequest"("expiresAt");
