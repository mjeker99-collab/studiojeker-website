import { db } from "../db";
import { PolicyError } from "../policy";
import { audit, type Tx } from "../workflow";
import { dialogManageInput } from "./dialog-input";
import { isManagedDialog } from "./workspace";
import { hubActor } from "./workflow";

export { dialogManageInput };

async function lock(tx: Tx, id: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"hub:" + id}))`;
}

/**
 * Archive, restore or permanently delete GPT dialog / Content Studio draft stubs.
 *
 * Deletes only the selected MarketingContent rows and their direct editorial
 * children (versions, approvals, publications, exports, transfers).
 * Campaigns, StudioSeries/projects, StudioJobs, media assets and independently
 * saved SOCIAL_POST rows on the same series remain untouched.
 */
export async function manageDialogs(actor: string, raw: unknown) {
  const d = dialogManageInput.parse(raw);
  return db.$transaction(async (tx) => {
    await hubActor(tx, actor);
    const results: { id: string; title: string; action: string }[] = [];
    for (const item of d.items) {
      await lock(tx, item.id);
      const content = await tx.marketingContent.findUnique({
        where: { id: item.id },
      });
      if (!content)
        throw new PolicyError(
          `Dialog nicht gefunden (${item.id}). Bitte Ansicht neu laden.`,
          404,
        );
      if (content.version !== item.version)
        throw new PolicyError(
          `«${content.title}» wurde geändert. Bitte Ansicht neu laden.`,
          409,
        );
      if (!isManagedDialog(content))
        throw new PolicyError(
          `«${content.title}» ist kein GPT-Dialog oder Content-Entwurf und kann hier nicht verwaltet werden.`,
          409,
        );
      if (content.workspace === "SOCIAL_POST")
        throw new PolicyError(
          `«${content.title}» ist ein Social Post und bleibt erhalten.`,
          409,
        );

      if (d.action === "archive") {
        if (!content.archivedAt) {
          await tx.marketingContent.update({
            where: { id: content.id },
            data: { archivedAt: new Date() },
          });
          await audit(tx, actor, "DIALOG_ARCHIVED", content.id, {
            title: content.title,
            workspace: content.workspace,
            version: content.version,
            studioSeriesId: content.studioSeriesId,
            campaignId: content.campaignId,
          });
        }
        results.push({
          id: content.id,
          title: content.title,
          action: "archive",
        });
        continue;
      }

      if (d.action === "restore") {
        if (content.archivedAt) {
          await tx.marketingContent.update({
            where: { id: content.id },
            data: { archivedAt: null },
          });
          await audit(tx, actor, "DIALOG_RESTORED", content.id, {
            title: content.title,
            workspace: content.workspace,
            version: content.version,
            studioSeriesId: content.studioSeriesId,
            campaignId: content.campaignId,
          });
        }
        results.push({
          id: content.id,
          title: content.title,
          action: "restore",
        });
        continue;
      }

      // Permanent delete — only this dialog content row.
      const seriesId = content.studioSeriesId;
      const campaignId = content.campaignId;
      await tx.marketingApproval.deleteMany({
        where: { contentId: content.id },
      });
      await tx.manualPublication.deleteMany({
        where: { contentId: content.id },
      });
      await tx.newsletterExport.deleteMany({
        where: { contentId: content.id },
      });
      await tx.mailchimpTransfer.deleteMany({
        where: { contentId: content.id },
      });
      await tx.marketingVersion.deleteMany({
        where: { contentId: content.id },
      });
      await tx.marketingContent.delete({ where: { id: content.id } });
      await audit(tx, actor, "DIALOG_DELETED", content.id, {
        title: content.title,
        workspace: content.workspace,
        version: content.version,
        studioSeriesId: seriesId,
        campaignId,
        preserved: {
          campaign: true,
          studioSeries: true,
          media: true,
          socialPosts: true,
        },
      });
      results.push({
        id: content.id,
        title: content.title,
        action: "delete",
      });
    }
    return { ok: true as const, action: d.action, results };
  });
}
