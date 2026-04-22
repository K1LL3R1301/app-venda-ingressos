-- CreateTable
CREATE TABLE "public"."TicketTransferRequest" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "requestedByName" TEXT,
    "requestedByEmail" TEXT,
    "requestedByCpf" TEXT,
    "fromName" TEXT,
    "fromEmail" TEXT,
    "fromCpf" TEXT,
    "toName" TEXT,
    "toEmail" TEXT,
    "toCpf" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
    "responseReason" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketTransferRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TicketTransferRequest_ticketId_idx" ON "public"."TicketTransferRequest"("ticketId");

-- CreateIndex
CREATE INDEX "TicketTransferRequest_orderId_idx" ON "public"."TicketTransferRequest"("orderId");

-- CreateIndex
CREATE INDEX "TicketTransferRequest_requestedByUserId_idx" ON "public"."TicketTransferRequest"("requestedByUserId");

-- CreateIndex
CREATE INDEX "TicketTransferRequest_fromUserId_idx" ON "public"."TicketTransferRequest"("fromUserId");

-- CreateIndex
CREATE INDEX "TicketTransferRequest_toUserId_idx" ON "public"."TicketTransferRequest"("toUserId");

-- CreateIndex
CREATE INDEX "TicketTransferRequest_status_idx" ON "public"."TicketTransferRequest"("status");

-- CreateIndex
CREATE INDEX "TicketTransferRequest_requestedAt_idx" ON "public"."TicketTransferRequest"("requestedAt");

-- CreateIndex
CREATE INDEX "TicketTransferRequest_respondedAt_idx" ON "public"."TicketTransferRequest"("respondedAt");

-- AddForeignKey
ALTER TABLE "public"."TicketTransferRequest" ADD CONSTRAINT "TicketTransferRequest_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TicketTransferRequest" ADD CONSTRAINT "TicketTransferRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TicketTransferRequest" ADD CONSTRAINT "TicketTransferRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TicketTransferRequest" ADD CONSTRAINT "TicketTransferRequest_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TicketTransferRequest" ADD CONSTRAINT "TicketTransferRequest_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
