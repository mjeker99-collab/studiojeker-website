/**
 * Read-only verification for Social Media dialog workspace + migrations.
 * Safe for Render Shell after backup. Never deletes or migrates.
 *
 * Usage (apps/akquise):
 *   npx tsx --env-file-if-exists=.env scripts/verify-dialog-workspace.ts
 *   node render/command.mjs inventory  # separate inventory helper
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function columnExists(table: string, column: string) {
  const rows = await db.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = ${table}
        AND column_name = ${column}
    ) AS "exists"`;
  return !!rows[0]?.exists;
}

async function main() {
  const workspace = await columnExists("MarketingContent", "workspace");
  const archivedAt = await columnExists("MarketingContent", "archivedAt");
  const counts = await db.$queryRaw<
    { workspace: string; archived: boolean; n: bigint }[]
  >`
    SELECT "workspace"::text AS workspace,
           ("archivedAt" IS NOT NULL) AS archived,
           COUNT(*)::bigint AS n
    FROM "MarketingContent"
    WHERE "kind" = 'SOCIAL'
    GROUP BY 1, 2
    ORDER BY 1, 2`;

  const publishable = await db.marketingContent.count({
    where: { kind: "SOCIAL", workspace: "SOCIAL_POST" },
  });
  const promoteQueue = await db.marketingContent.count({
    where: {
      kind: "SOCIAL",
      workspace: { in: ["GPT_DIALOG", "CONTENT_DRAFT"] },
      archivedAt: null,
    },
  });
  const archivedDialogs = await db.marketingContent.count({
    where: {
      kind: "SOCIAL",
      workspace: { in: ["GPT_DIALOG", "CONTENT_DRAFT"] },
      archivedAt: { not: null },
    },
  });

  const report = {
    columns: { workspace, archivedAt },
    socialByWorkspace: counts.map((r) => ({
      workspace: r.workspace,
      archived: r.archived,
      count: Number(r.n),
    })),
    publishableSocialPosts: publishable,
    activePromoteQueue: promoteQueue,
    archivedDialogs,
    ok: workspace && archivedAt,
  };
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) {
    console.error(
      "Fehlende Spalten: workspace und/oder archivedAt. Migrationen prüfen.",
    );
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
