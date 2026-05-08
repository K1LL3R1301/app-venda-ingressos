ALTER TABLE "Ticket"
  ADD COLUMN IF NOT EXISTS "accessKind" TEXT,
  ADD COLUMN IF NOT EXISTS "accessLabel" TEXT,
  ADD COLUMN IF NOT EXISTS "accessMetadata" JSONB;

CREATE INDEX IF NOT EXISTS "Ticket_accessKind_idx"
  ON "Ticket" ("accessKind");
