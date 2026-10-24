-- Additive Social Media Publishing Workspace classification.
-- No rows are deleted. Existing MarketingContent, versions, approvals and
-- publications remain intact. GPT dialog stubs stay in the database but leave
-- the Social Media publishing list after classification.

CREATE TYPE "ContentWorkspace" AS ENUM ('SOCIAL_POST', 'CONTENT_DRAFT', 'GPT_DIALOG');

ALTER TABLE "MarketingContent"
ADD COLUMN "workspace" "ContentWorkspace" NOT NULL DEFAULT 'SOCIAL_POST';

-- ChatGPT dialog stubs created via StudioChat use the conversation placeholders
-- "Im Gespräch klären" for goal and audience. Keep their rows; reclassify only.
UPDATE "MarketingContent" AS mc
SET "workspace" = 'GPT_DIALOG'
FROM "StudioSeries" AS ss
WHERE mc."studioSeriesId" = ss."id"
  AND mc."kind" = 'SOCIAL'
  AND mc."workspace" = 'SOCIAL_POST'
  AND NOT EXISTS (
    SELECT 1 FROM "StrategyConcept" AS sc WHERE sc."seriesId" = ss."id"
  )
  AND COALESCE(ss."briefing"->>'goal', '') = 'Im Gespräch klären'
  AND COALESCE(ss."briefing"->>'audience', '') = 'Im Gespräch klären';

-- Remaining studio-linked Social rows are Content Studio drafts, not publishing posts.
UPDATE "MarketingContent"
SET "workspace" = 'CONTENT_DRAFT'
WHERE "kind" = 'SOCIAL'
  AND "studioSeriesId" IS NOT NULL
  AND "workspace" = 'SOCIAL_POST';

-- Hub-created Social posts (no studio series) and all Newsletters stay SOCIAL_POST /
-- unchanged. Newsletter kind ignores workspace for publishing filters.

CREATE INDEX "MarketingContent_kind_workspace_status_idx"
ON "MarketingContent"("kind", "workspace", "status");
