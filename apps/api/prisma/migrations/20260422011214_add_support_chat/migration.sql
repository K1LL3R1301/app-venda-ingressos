-- CreateTable
CREATE TABLE "public"."SupportThread" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "orderId" TEXT,
    "customerEmail" TEXT NOT NULL,
    "customerName" TEXT,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "assignedUserId" TEXT,

    CONSTRAINT "SupportThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SupportMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderUserId" TEXT,
    "senderName" TEXT,
    "senderEmail" TEXT,
    "senderType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupportThread_organizerId_idx" ON "public"."SupportThread"("organizerId");

-- CreateIndex
CREATE INDEX "SupportThread_eventId_idx" ON "public"."SupportThread"("eventId");

-- CreateIndex
CREATE INDEX "SupportThread_orderId_idx" ON "public"."SupportThread"("orderId");

-- CreateIndex
CREATE INDEX "SupportThread_customerEmail_idx" ON "public"."SupportThread"("customerEmail");

-- CreateIndex
CREATE INDEX "SupportThread_status_idx" ON "public"."SupportThread"("status");

-- CreateIndex
CREATE INDEX "SupportThread_lastMessageAt_idx" ON "public"."SupportThread"("lastMessageAt");

-- CreateIndex
CREATE INDEX "SupportThread_assignedUserId_idx" ON "public"."SupportThread"("assignedUserId");

-- CreateIndex
CREATE INDEX "SupportMessage_threadId_idx" ON "public"."SupportMessage"("threadId");

-- CreateIndex
CREATE INDEX "SupportMessage_senderUserId_idx" ON "public"."SupportMessage"("senderUserId");

-- CreateIndex
CREATE INDEX "SupportMessage_senderType_idx" ON "public"."SupportMessage"("senderType");

-- CreateIndex
CREATE INDEX "SupportMessage_createdAt_idx" ON "public"."SupportMessage"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."SupportThread" ADD CONSTRAINT "SupportThread_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "public"."Organizer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SupportThread" ADD CONSTRAINT "SupportThread_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SupportThread" ADD CONSTRAINT "SupportThread_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SupportThread" ADD CONSTRAINT "SupportThread_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SupportMessage" ADD CONSTRAINT "SupportMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "public"."SupportThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SupportMessage" ADD CONSTRAINT "SupportMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
