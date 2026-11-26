-- Explicit acquisition send time. Null preserves the existing daily window.
ALTER TABLE "MailQueueItem" ADD COLUMN "sendAfter" TIMESTAMP(3);
CREATE INDEX "MailQueueItem_status_sendAfter_idx" ON "MailQueueItem"("status", "sendAfter");
