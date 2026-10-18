-- CreateEnum
CREATE TYPE "ContentKind" AS ENUM ('SOCIAL', 'NEWSLETTER');

-- CreateEnum
CREATE TYPE "EditorialStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'DONE');

-- AlterTable
ALTER TABLE "Draft" ADD COLUMN     "campaignId" TEXT,
ADD COLUMN     "ownerId" TEXT,
ADD COLUMN     "planningRevision" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "scheduledAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingContent" (
    "id" TEXT NOT NULL,
    "kind" "ContentKind" NOT NULL,
    "title" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "EditorialStatus" NOT NULL DEFAULT 'DRAFT',
    "campaignId" TEXT,
    "ownerId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingVersion" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "hash" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingApproval" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "hash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualPublication" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "url" TEXT NOT NULL DEFAULT '',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManualPublication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterExport" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'HTML_AND_TEXT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterExport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketingContent_campaignId_scheduledAt_idx" ON "MarketingContent"("campaignId", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingVersion_contentId_version_key" ON "MarketingVersion"("contentId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ManualPublication_contentId_version_channel_key" ON "ManualPublication"("contentId", "version", "channel");

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingContent" ADD CONSTRAINT "MarketingContent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingContent" ADD CONSTRAINT "MarketingContent_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingVersion" ADD CONSTRAINT "MarketingVersion_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "MarketingContent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingApproval" ADD CONSTRAINT "MarketingApproval_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "MarketingContent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingApproval" ADD CONSTRAINT "MarketingApproval_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualPublication" ADD CONSTRAINT "ManualPublication_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "MarketingContent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterExport" ADD CONSTRAINT "NewsletterExport_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "MarketingContent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

