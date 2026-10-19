CREATE TABLE "StrategyConcept" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL DEFAULT 'studiojeker',
  "seriesId" TEXT NOT NULL UNIQUE REFERENCES "StudioSeries"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "StrategyConcept_organizationId_updatedAt_idx" ON "StrategyConcept"("organizationId", "updatedAt");
CREATE TABLE "StrategyVersion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "conceptId" TEXT NOT NULL REFERENCES "StrategyConcept"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "version" INTEGER NOT NULL,
  "payload" JSONB NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "handoffCampaignId" TEXT UNIQUE,
  UNIQUE ("conceptId", "version")
);
