CREATE TABLE "LibraryFolder" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL DEFAULT 'studiojeker',
  "name" TEXT NOT NULL,
  "parentId" TEXT,
  "customerId" TEXT,
  "projectId" TEXT,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LibraryFolder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "StudioOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LibraryFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "LibraryFolder"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "LibraryFolder_organizationId_parentId_idx" ON "LibraryFolder"("organizationId", "parentId");
ALTER TABLE "LibraryItem" ADD COLUMN "folderId" TEXT, ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "LibraryItem" ADD CONSTRAINT "LibraryItem_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "LibraryFolder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "LibraryItem_folderId_idx" ON "LibraryItem"("folderId");
