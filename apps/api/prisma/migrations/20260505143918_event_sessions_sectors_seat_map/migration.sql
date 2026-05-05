-- CreateEnum
CREATE TYPE "public"."EventOccupancyMode" AS ENUM ('GENERAL_ADMISSION', 'RESERVED_SEATING', 'RESERVED_TABLE', 'MIXED');

-- CreateEnum
CREATE TYPE "public"."SeatMapObjectType" AS ENUM ('SEAT', 'ACCESSIBLE_SEAT', 'COMPANION_SEAT', 'TABLE', 'BOOTH', 'COUNTER', 'AREA', 'STAGE', 'SCREEN', 'AISLE', 'BLOCKED_SPACE');

-- AlterTable
ALTER TABLE "public"."Event" ADD COLUMN     "allowSeatMap" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allowTableMap" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "multiSession" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "occupancyMode" "public"."EventOccupancyMode" NOT NULL DEFAULT 'GENERAL_ADMISSION';

-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "eventSessionId" TEXT;

-- AlterTable
ALTER TABLE "public"."Ticket" ADD COLUMN     "eventSessionId" TEXT,
ADD COLUMN     "seatMapObjectId" TEXT,
ADD COLUMN     "venueSectorId" TEXT;

-- AlterTable
ALTER TABLE "public"."TicketType" ADD COLUMN     "eventSessionId" TEXT,
ADD COLUMN     "occupancyMode" "public"."EventOccupancyMode" NOT NULL DEFAULT 'GENERAL_ADMISSION',
ADD COLUMN     "venueSectorId" TEXT;

-- CreateTable
CREATE TABLE "public"."EventSession" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "capacity" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VenueSector" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT,
    "occupancyMode" "public"."EventOccupancyMode" NOT NULL DEFAULT 'GENERAL_ADMISSION',
    "capacity" INTEGER,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT,
    "gateName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VenueSector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VenueLayout" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "occupancyMode" "public"."EventOccupancyMode" NOT NULL DEFAULT 'GENERAL_ADMISSION',
    "width" INTEGER,
    "height" INTEGER,
    "mapData" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VenueLayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SeatMapObject" (
    "id" TEXT NOT NULL,
    "layoutId" TEXT NOT NULL,
    "venueSectorId" TEXT,
    "code" TEXT NOT NULL,
    "label" TEXT,
    "type" "public"."SeatMapObjectType" NOT NULL,
    "row" TEXT,
    "number" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "x" DECIMAL(10,2),
    "y" DECIMAL(10,2),
    "width" DECIMAL(10,2),
    "height" DECIMAL(10,2),
    "rotation" DECIMAL(10,2),
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeatMapObject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SeatHold" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventSessionId" TEXT,
    "venueSectorId" TEXT,
    "seatMapObjectId" TEXT,
    "ticketTypeId" TEXT,
    "userId" TEXT,
    "token" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeatHold_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventSession_eventId_idx" ON "public"."EventSession"("eventId");

-- CreateIndex
CREATE INDEX "EventSession_startsAt_idx" ON "public"."EventSession"("startsAt");

-- CreateIndex
CREATE INDEX "EventSession_status_idx" ON "public"."EventSession"("status");

-- CreateIndex
CREATE INDEX "EventSession_displayOrder_idx" ON "public"."EventSession"("displayOrder");

-- CreateIndex
CREATE INDEX "VenueSector_eventId_idx" ON "public"."VenueSector"("eventId");

-- CreateIndex
CREATE INDEX "VenueSector_occupancyMode_idx" ON "public"."VenueSector"("occupancyMode");

-- CreateIndex
CREATE INDEX "VenueSector_displayOrder_idx" ON "public"."VenueSector"("displayOrder");

-- CreateIndex
CREATE INDEX "VenueLayout_eventId_idx" ON "public"."VenueLayout"("eventId");

-- CreateIndex
CREATE INDEX "VenueLayout_occupancyMode_idx" ON "public"."VenueLayout"("occupancyMode");

-- CreateIndex
CREATE INDEX "VenueLayout_isDefault_idx" ON "public"."VenueLayout"("isDefault");

-- CreateIndex
CREATE INDEX "VenueLayout_status_idx" ON "public"."VenueLayout"("status");

-- CreateIndex
CREATE INDEX "SeatMapObject_layoutId_idx" ON "public"."SeatMapObject"("layoutId");

-- CreateIndex
CREATE INDEX "SeatMapObject_venueSectorId_idx" ON "public"."SeatMapObject"("venueSectorId");

-- CreateIndex
CREATE INDEX "SeatMapObject_type_idx" ON "public"."SeatMapObject"("type");

-- CreateIndex
CREATE INDEX "SeatMapObject_status_idx" ON "public"."SeatMapObject"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SeatMapObject_layoutId_code_key" ON "public"."SeatMapObject"("layoutId", "code");

-- CreateIndex
CREATE INDEX "SeatHold_eventId_idx" ON "public"."SeatHold"("eventId");

-- CreateIndex
CREATE INDEX "SeatHold_eventSessionId_idx" ON "public"."SeatHold"("eventSessionId");

-- CreateIndex
CREATE INDEX "SeatHold_venueSectorId_idx" ON "public"."SeatHold"("venueSectorId");

-- CreateIndex
CREATE INDEX "SeatHold_seatMapObjectId_idx" ON "public"."SeatHold"("seatMapObjectId");

-- CreateIndex
CREATE INDEX "SeatHold_ticketTypeId_idx" ON "public"."SeatHold"("ticketTypeId");

-- CreateIndex
CREATE INDEX "SeatHold_userId_idx" ON "public"."SeatHold"("userId");

-- CreateIndex
CREATE INDEX "SeatHold_token_idx" ON "public"."SeatHold"("token");

-- CreateIndex
CREATE INDEX "SeatHold_status_idx" ON "public"."SeatHold"("status");

-- CreateIndex
CREATE INDEX "SeatHold_expiresAt_idx" ON "public"."SeatHold"("expiresAt");

-- CreateIndex
CREATE INDEX "Order_eventSessionId_idx" ON "public"."Order"("eventSessionId");

-- CreateIndex
CREATE INDEX "Ticket_eventSessionId_idx" ON "public"."Ticket"("eventSessionId");

-- CreateIndex
CREATE INDEX "Ticket_venueSectorId_idx" ON "public"."Ticket"("venueSectorId");

-- CreateIndex
CREATE INDEX "Ticket_seatMapObjectId_idx" ON "public"."Ticket"("seatMapObjectId");

-- CreateIndex
CREATE INDEX "TicketType_eventSessionId_idx" ON "public"."TicketType"("eventSessionId");

-- CreateIndex
CREATE INDEX "TicketType_venueSectorId_idx" ON "public"."TicketType"("venueSectorId");

-- CreateIndex
CREATE INDEX "TicketType_occupancyMode_idx" ON "public"."TicketType"("occupancyMode");

-- AddForeignKey
ALTER TABLE "public"."EventSession" ADD CONSTRAINT "EventSession_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VenueSector" ADD CONSTRAINT "VenueSector_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VenueLayout" ADD CONSTRAINT "VenueLayout_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SeatMapObject" ADD CONSTRAINT "SeatMapObject_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "public"."VenueLayout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SeatMapObject" ADD CONSTRAINT "SeatMapObject_venueSectorId_fkey" FOREIGN KEY ("venueSectorId") REFERENCES "public"."VenueSector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SeatHold" ADD CONSTRAINT "SeatHold_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SeatHold" ADD CONSTRAINT "SeatHold_eventSessionId_fkey" FOREIGN KEY ("eventSessionId") REFERENCES "public"."EventSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SeatHold" ADD CONSTRAINT "SeatHold_venueSectorId_fkey" FOREIGN KEY ("venueSectorId") REFERENCES "public"."VenueSector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SeatHold" ADD CONSTRAINT "SeatHold_seatMapObjectId_fkey" FOREIGN KEY ("seatMapObjectId") REFERENCES "public"."SeatMapObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SeatHold" ADD CONSTRAINT "SeatHold_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "public"."TicketType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SeatHold" ADD CONSTRAINT "SeatHold_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TicketType" ADD CONSTRAINT "TicketType_eventSessionId_fkey" FOREIGN KEY ("eventSessionId") REFERENCES "public"."EventSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TicketType" ADD CONSTRAINT "TicketType_venueSectorId_fkey" FOREIGN KEY ("venueSectorId") REFERENCES "public"."VenueSector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_eventSessionId_fkey" FOREIGN KEY ("eventSessionId") REFERENCES "public"."EventSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ticket" ADD CONSTRAINT "Ticket_eventSessionId_fkey" FOREIGN KEY ("eventSessionId") REFERENCES "public"."EventSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ticket" ADD CONSTRAINT "Ticket_venueSectorId_fkey" FOREIGN KEY ("venueSectorId") REFERENCES "public"."VenueSector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ticket" ADD CONSTRAINT "Ticket_seatMapObjectId_fkey" FOREIGN KEY ("seatMapObjectId") REFERENCES "public"."SeatMapObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
