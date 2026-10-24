CREATE TABLE "WebsiteProject" (
 "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL DEFAULT 'studiojeker', "customerId" TEXT,
 "name" TEXT NOT NULL, "version" INTEGER NOT NULL DEFAULT 1, "createdBy" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "WebsiteProject_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "WebsiteVersion" (
 "id" TEXT NOT NULL, "projectId" TEXT NOT NULL, "version" INTEGER NOT NULL, "payload" JSONB NOT NULL,
 "createdBy" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "WebsiteVersion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WebsiteProject_organizationId_updatedAt_idx" ON "WebsiteProject"("organizationId", "updatedAt");
CREATE UNIQUE INDEX "WebsiteVersion_projectId_version_key" ON "WebsiteVersion"("projectId", "version");
ALTER TABLE "WebsiteVersion" ADD CONSTRAINT "WebsiteVersion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "WebsiteProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
