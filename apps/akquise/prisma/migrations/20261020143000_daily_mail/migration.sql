CREATE TABLE "MailSchedule" (
 "id" TEXT NOT NULL DEFAULT 'studiojeker', "enabled" BOOLEAN NOT NULL DEFAULT false,
 "dailyLimit" INTEGER NOT NULL DEFAULT 25, "weekdaysOnly" BOOLEAN NOT NULL DEFAULT true,
 "startHour" INTEGER NOT NULL DEFAULT 9, "endHour" INTEGER NOT NULL DEFAULT 17,
 "intervalMinutes" INTEGER NOT NULL DEFAULT 15, "revision" INTEGER NOT NULL DEFAULT 1,
 "activatedBy" TEXT, "lastClaimAt" TIMESTAMP(3), "heartbeatAt" TIMESTAMP(3),
 "pauseReason" TEXT, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "MailSchedule_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "MailSchedule_limits" CHECK ("dailyLimit" BETWEEN 1 AND 500 AND "startHour" >= 0 AND "endHour" <= 24 AND "startHour" < "endHour" AND "intervalMinutes" BETWEEN 1 AND 120)
);
CREATE TABLE "MailQueueItem" (
 "id" TEXT NOT NULL, "draftId" TEXT NOT NULL, "version" INTEGER NOT NULL,
 "hash" TEXT NOT NULL, "userId" TEXT NOT NULL, "recipient" TEXT NOT NULL,
 "subject" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'QUEUED', "error" TEXT,
 "deliveryId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "MailQueueItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MailQueueItem_draftId_version_key" ON "MailQueueItem"("draftId", "version");
CREATE INDEX "MailQueueItem_status_createdAt_idx" ON "MailQueueItem"("status", "createdAt");
