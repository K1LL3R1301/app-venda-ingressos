CREATE TABLE IF NOT EXISTS "PlaceReservation" (
  "id" TEXT PRIMARY KEY,
  "eventId" TEXT NOT NULL,
  "eventSessionId" TEXT,
  "venueSectorId" TEXT,
  "seatMapObjectId" TEXT,
  "ticketTypeId" TEXT,
  "orderId" TEXT,
  "userId" TEXT,
  "placeKey" TEXT NOT NULL,
  "physicalKey" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "label" TEXT,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "chairCount" INTEGER,
  "subTickets" JSONB,
  "amount" NUMERIC(10, 2),
  "status" TEXT NOT NULL DEFAULT 'HELD',
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PlaceReservation_event_idx"
  ON "PlaceReservation" ("eventId");

CREATE INDEX IF NOT EXISTS "PlaceReservation_session_sector_idx"
  ON "PlaceReservation" ("eventSessionId", "venueSectorId");

CREATE INDEX IF NOT EXISTS "PlaceReservation_physical_idx"
  ON "PlaceReservation" ("eventId", "eventSessionId", "venueSectorId", "physicalKey");

CREATE INDEX IF NOT EXISTS "PlaceReservation_order_idx"
  ON "PlaceReservation" ("orderId");

CREATE INDEX IF NOT EXISTS "PlaceReservation_status_expires_idx"
  ON "PlaceReservation" ("status", "expiresAt");
