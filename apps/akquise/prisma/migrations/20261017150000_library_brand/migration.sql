-- Additive only: existing assets and all editorial snapshots remain unchanged.
ALTER TABLE "StudioOrganization" ADD COLUMN "brandRevision" INTEGER NOT NULL DEFAULT 1;
CREATE TABLE "LibraryItem" (
 "id" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL DEFAULT 'studiojeker' REFERENCES "StudioOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "assetId" TEXT UNIQUE REFERENCES "StudioAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE, "kind" TEXT NOT NULL, "title" TEXT NOT NULL,
 "description" TEXT NOT NULL DEFAULT '', "source" TEXT NOT NULL DEFAULT '', "rights" TEXT NOT NULL DEFAULT '',
 "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "campaignId" TEXT, "text" TEXT NOT NULL DEFAULT '',
 "url" TEXT NOT NULL DEFAULT '', "thumbnailAssetId" TEXT, "parentAssetId" TEXT,
 "revision" INTEGER NOT NULL DEFAULT 1, "archivedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "LibraryItem_organizationId_createdAt_idx" ON "LibraryItem"("organizationId","createdAt");
INSERT INTO "LibraryItem" ("id","organizationId","assetId","kind","title","archivedAt","createdAt")
 SELECT 'asset-' || "id", "organizationId", "id", CASE WHEN "kind"='FONT' THEN 'FONT' WHEN "kind"='EXPORT' THEN 'EXPORT' ELSE 'IMAGE' END, "name", "deletedAt", "createdAt" FROM "StudioAsset";
