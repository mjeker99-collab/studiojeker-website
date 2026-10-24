-- Additive only. Existing versions, approvals, audit records and delivery IDs remain intact.
ALTER TYPE "DeliveryStatus" ADD VALUE 'SENDING';
ALTER TYPE "DeliveryStatus" ADD VALUE 'UNKNOWN';
ALTER TYPE "DeliveryStatus" ADD VALUE 'TEST_SENT';
ALTER TABLE "Delivery" ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'LOCAL',
 ADD COLUMN "envelopeRecipients" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
 ADD COLUMN "completedAt" TIMESTAMP(3);
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE INDEX "Delivery_mode_createdAt_idx" ON "Delivery"("mode", "createdAt");
CREATE INDEX "Delivery_recipient_status_idx" ON "Delivery"("recipient", "status");
