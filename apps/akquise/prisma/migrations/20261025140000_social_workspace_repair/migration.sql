-- Idempotent Social Media workspace repair. No rows are deleted.
-- 1) Remaining conversation stubs still marked SOCIAL_POST → GPT_DIALOG
-- 2) Sync campaignId from StudioSeries briefing onto draft/dialog stubs only
-- Never touches Hub-created SOCIAL_POST without a studio series.
-- Never reclassifies published posts (ManualPublication present).

UPDATE "MarketingContent" AS mc
SET "workspace" = 'GPT_DIALOG'
FROM "StudioSeries" AS ss
WHERE mc."studioSeriesId" = ss."id"
  AND mc."kind" = 'SOCIAL'
  AND mc."workspace" = 'SOCIAL_POST'
  AND NOT EXISTS (
    SELECT 1 FROM "StrategyConcept" AS sc WHERE sc."seriesId" = ss."id"
  )
  AND NOT EXISTS (
    SELECT 1 FROM "ManualPublication" AS mp WHERE mp."contentId" = mc."id"
  )
  AND (
    COALESCE(ss."briefing"->>'workspace', '') = 'GPT_DIALOG'
    OR (
      COALESCE(ss."briefing"->>'goal', '') = 'Im Gespräch klären'
      AND COALESCE(ss."briefing"->>'audience', '') = 'Im Gespräch klären'
    )
  );

-- Reliable campaign assignment for stubs still without campaignId.
UPDATE "MarketingContent" AS mc
SET "campaignId" = NULLIF(ss."briefing"->>'campaignId', '')
FROM "StudioSeries" AS ss
WHERE mc."studioSeriesId" = ss."id"
  AND mc."campaignId" IS NULL
  AND mc."workspace" IN ('GPT_DIALOG', 'CONTENT_DRAFT')
  AND NULLIF(ss."briefing"->>'campaignId', '') IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM "Campaign" AS c
    WHERE c."id" = NULLIF(ss."briefing"->>'campaignId', '')
  );
