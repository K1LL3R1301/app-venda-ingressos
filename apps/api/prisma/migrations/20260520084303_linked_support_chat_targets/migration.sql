-- Linked support chat targets and participants
ALTER TABLE "SupportThread" ADD COLUMN IF NOT EXISTS "participants" JSONB;
ALTER TABLE "SupportThread" ADD COLUMN IF NOT EXISTS "sourceType" TEXT NOT NULL DEFAULT 'CUSTOMER';

ALTER TABLE "SupportMessage" ADD COLUMN IF NOT EXISTS "targetType" TEXT NOT NULL DEFAULT 'ALL';
ALTER TABLE "SupportMessage" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

CREATE INDEX IF NOT EXISTS "SupportThread_sourceType_idx" ON "SupportThread"("sourceType");
CREATE INDEX IF NOT EXISTS "SupportMessage_targetType_idx" ON "SupportMessage"("targetType");