-- Additive storage for the lead-research job. No existing table is changed.
CREATE TABLE "LeadResearchJob" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL DEFAULT 'studiojeker',
    "idempotencyKey" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "leaseOwner" TEXT NOT NULL DEFAULT '',
    "leaseUntil" TIMESTAMP(3),
    "state" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadResearchJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LeadResearchJob_idempotencyKey_key" ON "LeadResearchJob"("idempotencyKey");
CREATE INDEX "LeadResearchJob_organizationId_dayKey_idx" ON "LeadResearchJob"("organizationId", "dayKey");

ALTER TABLE "LeadResearchJob" ADD CONSTRAINT "LeadResearchJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "StudioOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
