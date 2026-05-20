-- Linked support workflow: producer/operator/super admin
ALTER TABLE "SupportThread" ADD COLUMN IF NOT EXISTS "protocol" TEXT;
ALTER TABLE "SupportThread" ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "SupportThread" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'EVENT_SUPPORT';
ALTER TABLE "SupportThread" ADD COLUMN IF NOT EXISTS "currentOwnerType" TEXT NOT NULL DEFAULT 'PRODUCER';

ALTER TABLE "SupportThread" ADD COLUMN IF NOT EXISTS "producerUserId" TEXT;
ALTER TABLE "SupportThread" ADD COLUMN IF NOT EXISTS "producerName" TEXT;
ALTER TABLE "SupportThread" ADD COLUMN IF NOT EXISTS "producerEmail" TEXT;

ALTER TABLE "SupportThread" ADD COLUMN IF NOT EXISTS "operatorUserId" TEXT;
ALTER TABLE "SupportThread" ADD COLUMN IF NOT EXISTS "operatorName" TEXT;
ALTER TABLE "SupportThread" ADD COLUMN IF NOT EXISTS "operatorEmail" TEXT;

ALTER TABLE "SupportThread" ADD COLUMN IF NOT EXISTS "forwardedAt" TIMESTAMP(3);
ALTER TABLE "SupportThread" ADD COLUMN IF NOT EXISTS "returnedAt" TIMESTAMP(3);
ALTER TABLE "SupportThread" ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3);
ALTER TABLE "SupportThread" ADD COLUMN IF NOT EXISTS "supportHistory" JSONB;

ALTER TABLE "SupportMessage" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'MESSAGE';
ALTER TABLE "SupportMessage" ADD COLUMN IF NOT EXISTS "internal" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "SupportThread_protocol_key" ON "SupportThread"("protocol");
CREATE INDEX IF NOT EXISTS "SupportThread_protocol_idx" ON "SupportThread"("protocol");
CREATE INDEX IF NOT EXISTS "SupportThread_priority_idx" ON "SupportThread"("priority");
CREATE INDEX IF NOT EXISTS "SupportThread_category_idx" ON "SupportThread"("category");
CREATE INDEX IF NOT EXISTS "SupportThread_currentOwnerType_idx" ON "SupportThread"("currentOwnerType");
CREATE INDEX IF NOT EXISTS "SupportThread_producerUserId_idx" ON "SupportThread"("producerUserId");
CREATE INDEX IF NOT EXISTS "SupportThread_producerEmail_idx" ON "SupportThread"("producerEmail");
CREATE INDEX IF NOT EXISTS "SupportThread_operatorUserId_idx" ON "SupportThread"("operatorUserId");
CREATE INDEX IF NOT EXISTS "SupportThread_operatorEmail_idx" ON "SupportThread"("operatorEmail");
CREATE INDEX IF NOT EXISTS "SupportThread_resolvedAt_idx" ON "SupportThread"("resolvedAt");

CREATE INDEX IF NOT EXISTS "SupportMessage_kind_idx" ON "SupportMessage"("kind");
CREATE INDEX IF NOT EXISTS "SupportMessage_internal_idx" ON "SupportMessage"("internal");