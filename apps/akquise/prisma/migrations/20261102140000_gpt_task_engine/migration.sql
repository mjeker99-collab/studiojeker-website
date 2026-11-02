-- CreateEnum
CREATE TYPE "GptTaskStatus" AS ENUM ('QUEUED', 'RUNNING', 'WAITING_APPROVAL', 'BLOCKED', 'FAILED', 'SUCCEEDED');

-- CreateTable
CREATE TABLE "GptTask" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL DEFAULT 'studiojeker',
    "userId" TEXT NOT NULL,
    "customerId" TEXT,
    "campaignId" TEXT,
    "contentId" TEXT NOT NULL,
    "contentVersion" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "instruction" TEXT NOT NULL,
    "status" "GptTaskStatus" NOT NULL DEFAULT 'QUEUED',
    "step" TEXT NOT NULL DEFAULT 'queued',
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "externalJobId" TEXT,
    "result" JSONB NOT NULL DEFAULT '{}',
    "error" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "leaseOwner" TEXT,
    "leaseUntil" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GptTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GptTaskStep" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '',
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GptTaskStep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GptTaskApproval" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "contentVersion" INTEGER NOT NULL,
    "hash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GptTaskApproval_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GptTask_idempotencyKey_key" ON "GptTask"("idempotencyKey");
CREATE INDEX "GptTask_status_nextAttemptAt_idx" ON "GptTask"("status", "nextAttemptAt");
CREATE INDEX "GptTask_contentId_createdAt_idx" ON "GptTask"("contentId", "createdAt");
CREATE INDEX "GptTask_userId_createdAt_idx" ON "GptTask"("userId", "createdAt");
CREATE INDEX "GptTaskStep_taskId_createdAt_idx" ON "GptTaskStep"("taskId", "createdAt");
CREATE UNIQUE INDEX "GptTaskApproval_taskId_key" ON "GptTaskApproval"("taskId");

ALTER TABLE "GptTask" ADD CONSTRAINT "GptTask_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "StudioOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GptTask" ADD CONSTRAINT "GptTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GptTask" ADD CONSTRAINT "GptTask_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GptTask" ADD CONSTRAINT "GptTask_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GptTask" ADD CONSTRAINT "GptTask_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "MarketingContent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GptTaskStep" ADD CONSTRAINT "GptTaskStep_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "GptTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GptTaskApproval" ADD CONSTRAINT "GptTaskApproval_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "GptTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
