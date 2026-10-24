-- Controlled ChatGPT write-drafts: write grants, idempotency, last write access.
-- write_drafts stays opt-in; existing scopes JSON without the key remains read-only.

ALTER TABLE "GptIntegration" ADD COLUMN "lastWriteAccessAt" TIMESTAMP(3);

CREATE TABLE "GptWriteGrant" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "grantedBy" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GptWriteGrant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GptWriteGrant_entityType_entityId_key" ON "GptWriteGrant"("entityType", "entityId");
CREATE INDEX "GptWriteGrant_entityType_grantedAt_idx" ON "GptWriteGrant"("entityType", "grantedAt");

CREATE TABLE "GptIdempotency" (
    "key" TEXT NOT NULL,
    "draftKind" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GptIdempotency_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "GptIdempotency_createdAt_idx" ON "GptIdempotency"("createdAt");
