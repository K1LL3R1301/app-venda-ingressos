/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Event` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `Organizer` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Event" ADD COLUMN     "category" TEXT,
ADD COLUMN     "checkoutSubtitle" TEXT,
ADD COLUMN     "checkoutTitle" TEXT,
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "highlightTag" TEXT,
ADD COLUMN     "saleEndAt" TIMESTAMP(3),
ADD COLUMN     "saleStartAt" TIMESTAMP(3),
ADD COLUMN     "shortDescription" TEXT,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
ADD COLUMN     "visibility" TEXT NOT NULL DEFAULT 'PUBLIC';

-- AlterTable
ALTER TABLE "public"."Organizer" ADD COLUMN     "bannerUrl" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "facebookUrl" TEXT,
ADD COLUMN     "instagramUrl" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "websiteUrl" TEXT,
ADD COLUMN     "whatsapp" TEXT,
ADD COLUMN     "youtubeUrl" TEXT;

-- AlterTable
ALTER TABLE "public"."TicketType" ADD COLUMN     "benefitDescription" TEXT,
ADD COLUMN     "displayOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "feeAmount" DECIMAL(10,2),
ADD COLUMN     "feeDescription" TEXT,
ADD COLUMN     "isHidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lotLabel" TEXT,
ADD COLUMN     "maxPerOrder" INTEGER,
ADD COLUMN     "minPerOrder" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "salesEndAt" TIMESTAMP(3),
ADD COLUMN     "salesStartAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."EventContent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "headline" TEXT,
    "summary" TEXT,
    "fullDescription" TEXT,
    "attractions" TEXT,
    "schedule" TEXT,
    "sectorDetails" TEXT,
    "importantInfo" TEXT,
    "faq" TEXT,
    "producerDescription" TEXT,
    "purchaseInstructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventLocation" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'PRESENTIAL',
    "venueName" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "reference" TEXT,
    "mapUrl" TEXT,
    "instructions" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventMedia" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "bannerImageUrl" TEXT,
    "thumbnailUrl" TEXT,
    "mobileBannerUrl" TEXT,
    "sectorMapImageUrl" TEXT,
    "gallery" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventPolicy" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "ageRating" TEXT,
    "refundPolicy" TEXT,
    "halfEntryPolicy" TEXT,
    "transferPolicy" TEXT,
    "termsNotes" TEXT,
    "entryRules" TEXT,
    "documentRules" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventContent_eventId_key" ON "public"."EventContent"("eventId");

-- CreateIndex
CREATE INDEX "EventContent_eventId_idx" ON "public"."EventContent"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "EventLocation_eventId_key" ON "public"."EventLocation"("eventId");

-- CreateIndex
CREATE INDEX "EventLocation_eventId_idx" ON "public"."EventLocation"("eventId");

-- CreateIndex
CREATE INDEX "EventLocation_city_state_idx" ON "public"."EventLocation"("city", "state");

-- CreateIndex
CREATE UNIQUE INDEX "EventMedia_eventId_key" ON "public"."EventMedia"("eventId");

-- CreateIndex
CREATE INDEX "EventMedia_eventId_idx" ON "public"."EventMedia"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "EventPolicy_eventId_key" ON "public"."EventPolicy"("eventId");

-- CreateIndex
CREATE INDEX "EventPolicy_eventId_idx" ON "public"."EventPolicy"("eventId");

-- CreateIndex
CREATE INDEX "Checkin_ticketId_idx" ON "public"."Checkin"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "public"."Event"("slug");

-- CreateIndex
CREATE INDEX "Order_eventId_idx" ON "public"."Order"("eventId");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "public"."OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_ticketTypeId_idx" ON "public"."OrderItem"("ticketTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "Organizer_slug_key" ON "public"."Organizer"("slug");

-- CreateIndex
CREATE INDEX "TicketType_eventId_idx" ON "public"."TicketType"("eventId");

-- CreateIndex
CREATE INDEX "TicketType_status_idx" ON "public"."TicketType"("status");

-- CreateIndex
CREATE INDEX "TicketType_displayOrder_idx" ON "public"."TicketType"("displayOrder");

-- AddForeignKey
ALTER TABLE "public"."EventContent" ADD CONSTRAINT "EventContent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventLocation" ADD CONSTRAINT "EventLocation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventMedia" ADD CONSTRAINT "EventMedia_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventPolicy" ADD CONSTRAINT "EventPolicy_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
