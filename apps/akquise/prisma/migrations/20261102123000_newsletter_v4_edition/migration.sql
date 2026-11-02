ALTER TABLE "NewsletterCursorTask" ADD COLUMN "route" TEXT NOT NULL DEFAULT 'cursor';
CREATE TABLE "NewsletterEdition" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "sourceTemplateId" TEXT NOT NULL,
    "contentVersion" INTEGER NOT NULL,
    "baseRef" TEXT NOT NULL,
    "prUrl" TEXT NOT NULL DEFAULT '',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NewsletterEdition_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NewsletterEdition_contentId_key" ON "NewsletterEdition"("contentId");
ALTER TABLE "NewsletterEdition" ADD CONSTRAINT "NewsletterEdition_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "MarketingContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NewsletterEdition" ADD CONSTRAINT "NewsletterEdition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
