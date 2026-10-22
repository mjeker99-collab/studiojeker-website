-- Customer profile assistance shares the existing request ledger and budget,
-- but does not create a content series or expose customer research in chat history.
ALTER TABLE "StudioJob" ALTER COLUMN "seriesId" DROP NOT NULL;
