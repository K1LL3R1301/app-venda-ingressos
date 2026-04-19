-- CreateTable
CREATE TABLE "public"."WalletTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TicketCancellation" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "originalAmount" DECIMAL(10,2) NOT NULL,
    "returnedAmount" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketCancellation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WalletTransaction_userId_idx" ON "public"."WalletTransaction"("userId");

-- CreateIndex
CREATE INDEX "WalletTransaction_source_idx" ON "public"."WalletTransaction"("source");

-- CreateIndex
CREATE INDEX "TicketCancellation_ticketId_idx" ON "public"."TicketCancellation"("ticketId");

-- CreateIndex
CREATE INDEX "TicketCancellation_orderId_idx" ON "public"."TicketCancellation"("orderId");

-- CreateIndex
CREATE INDEX "TicketCancellation_userId_idx" ON "public"."TicketCancellation"("userId");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "public"."Payment"("orderId");

-- CreateIndex
CREATE INDEX "Ticket_orderItemId_idx" ON "public"."Ticket"("orderItemId");

-- AddForeignKey
ALTER TABLE "public"."WalletTransaction" ADD CONSTRAINT "WalletTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TicketCancellation" ADD CONSTRAINT "TicketCancellation_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TicketCancellation" ADD CONSTRAINT "TicketCancellation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TicketCancellation" ADD CONSTRAINT "TicketCancellation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
