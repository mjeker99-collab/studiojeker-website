CREATE TABLE "NewsletterCursorTask" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "templateId" TEXT NOT NULL,
    "instruction" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_SENT',
    "agentId" TEXT NOT NULL DEFAULT '',
    "runId" TEXT NOT NULL DEFAULT '',
    "agentUrl" TEXT NOT NULL DEFAULT '',
    "prUrl" TEXT NOT NULL DEFAULT '',
    "errorMessage" TEXT NOT NULL DEFAULT '',
    "pendingUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NewsletterCursorTask_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NewsletterCursorTask_contentId_key" ON "NewsletterCursorTask"("contentId");
CREATE INDEX "NewsletterCursorTask_status_idx" ON "NewsletterCursorTask"("status");
ALTER TABLE "NewsletterCursorTask" ADD CONSTRAINT "NewsletterCursorTask_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "MarketingContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NewsletterCursorTask" ADD CONSTRAINT "NewsletterCursorTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
