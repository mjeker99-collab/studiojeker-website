CREATE TABLE "MailchimpTransfer" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "hash" TEXT NOT NULL,
    "audienceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "remoteId" TEXT,
    "webId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MailchimpTransfer_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MailchimpTransfer_contentId_version_key" ON "MailchimpTransfer"("contentId", "version");
ALTER TABLE "MailchimpTransfer" ADD CONSTRAINT "MailchimpTransfer_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "MarketingContent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
