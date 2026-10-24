-- ChatGPT read-only connector: explicit shares and integration settings.
-- No secrets are stored here; the connector token remains a Render env var.

CREATE TABLE "GptIntegration" (
    "id" TEXT NOT NULL,
    "scopes" JSONB NOT NULL DEFAULT '{"projects":true,"campaigns":true,"concepts":true,"content":true}',
    "revokedAt" TIMESTAMP(3),
    "lastAccessAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    CONSTRAINT "GptIntegration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GptShare" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "sharedBy" TEXT NOT NULL,
    "sharedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GptShare_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GptShare_entityType_entityId_key" ON "GptShare"("entityType", "entityId");
CREATE INDEX "GptShare_entityType_sharedAt_idx" ON "GptShare"("entityType", "sharedAt");

INSERT INTO "GptIntegration" ("id", "scopes", "updatedAt")
VALUES ('studiojeker', '{"projects":true,"campaigns":true,"concepts":true,"content":true}', CURRENT_TIMESTAMP);
