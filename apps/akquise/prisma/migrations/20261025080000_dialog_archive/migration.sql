-- Soft-archive for GPT dialogs and Content Studio drafts in «Zur Übernahme».
-- Additive only: no existing rows deleted. Social posts remain unarchived.
-- Campaigns, StudioSeries, assets and independently saved SOCIAL_POST rows stay intact.

ALTER TABLE "MarketingContent"
ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "MarketingContent_archivedAt_idx"
ON "MarketingContent"("archivedAt");
