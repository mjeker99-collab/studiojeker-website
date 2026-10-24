CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL DEFAULT 'studiojeker',
    "name" TEXT NOT NULL,
    "website" TEXT NOT NULL DEFAULT '',
    "contactName" TEXT NOT NULL DEFAULT '',
    "contactEmail" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Customer_organizationId_name_idx" ON "Customer"("organizationId", "name");
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "StudioOrganization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Campaign" ADD COLUMN "customerId" TEXT;
ALTER TABLE "StudioSeries" ADD COLUMN "customerId" TEXT;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudioSeries" ADD CONSTRAINT "StudioSeries_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Campaign_customerId_idx" ON "Campaign"("customerId");
CREATE INDEX "StudioSeries_customerId_idx" ON "StudioSeries"("customerId");
