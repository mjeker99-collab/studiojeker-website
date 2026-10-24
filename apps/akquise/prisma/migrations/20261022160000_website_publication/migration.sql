CREATE TABLE "WebsitePublication" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "payload" JSONB NOT NULL,
  "media" JSONB NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "publishedBy" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebsitePublication_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WebsitePublication_projectId_key" ON "WebsitePublication"("projectId");
CREATE UNIQUE INDEX "WebsitePublication_slug_key" ON "WebsitePublication"("slug");
ALTER TABLE "WebsitePublication" ADD CONSTRAINT "WebsitePublication_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "WebsiteProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
