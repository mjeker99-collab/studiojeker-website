import { db } from "../db";
import { PolicyError } from "../policy";
import { audit } from "../workflow";
import { ORG, briefingSchema } from "../studio/input";
import { contentInput } from "./input";
import { hubActor, saveContentInTx } from "./workflow";
import { applyNewsletterEdit, newsletterEditTarget } from "./newsletter-edit";
import { verifyNewsletterImageChanges } from "./newsletter-image-check";

export async function newsletterSession(actor: string, raw: unknown) {
  const target = newsletterEditTarget.parse(raw);
  return db.$transaction(async (tx) => {
    await hubActor(tx, actor);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"hub:" + target.id}))`;
    const content = await tx.marketingContent.findFirst({
      where: { id: target.id, organizationId: ORG, kind: "NEWSLETTER", archivedAt: null },
      include: { versions: { where: { version: target.version } } },
    });
    if (!content || content.version !== target.version || !content.versions[0])
      throw new PolicyError("Newsletter wurde geändert. Bitte neu öffnen.", 409);
    const payload = contentInput.parse(content.versions[0].payload);
    if (!payload.newsletter) throw new PolicyError("Newsletter-Vorlage fehlt.");
    if (content.studioSeriesId) return { seriesId: content.studioSeriesId };
    const campaign = content.campaignId
      ? await tx.campaign.findFirst({ where: { id: content.campaignId, organizationId: ORG } })
      : null;
    const briefing = briefingSchema.parse({
      title: content.title, topic: "Newsletter im Dialog bearbeiten",
      offer: "Nur bestätigte Angaben aus dem Newsletter verwenden",
      goal: "Gezielte Änderungen am geöffneten Newsletter",
      audience: payload.audience || "Bestehende Newsletter-Zielgruppe",
      tone: "Schweizer Hochdeutsch", channels: ["INSTAGRAM"], count: 1,
      formats: ["4:5"], campaignId: content.campaignId,
      customerId: campaign?.customerId || null, referenceAssetIds: [], brandRules: [],
    });
    // A newsletter conversation does not create any social-post placeholder.
    const series = await tx.studioSeries.create({ data: {
      title: content.title, ownerId: actor, organizationId: ORG,
      customerId: campaign?.customerId || null, briefing,
    } });
    await tx.marketingContent.update({ where: { id: content.id }, data: { studioSeriesId: series.id } });
    await audit(tx, actor, "NEWSLETTER_DIALOG_CREATED", content.id, { seriesId: series.id });
    return { seriesId: series.id };
  });
}

export async function applyNewsletterJob(actor: string, id: string) {
  return db.$transaction(async (tx) => {
    await hubActor(tx, actor);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"studio-job:" + id}))`;
    const job = await tx.studioJob.findFirst({ where: { id, organizationId: ORG, kind: "CHAT" } });
    if (!job || !["SUCCEEDED", "APPLIED"].includes(job.status))
      throw new PolicyError("GPT-Antwort ist noch nicht verfügbar.", 409);
    const input = job.input as { request?: { newsletterEdit?: unknown } };
    const target = newsletterEditTarget.parse(input.request?.newsletterEdit);
    if (job.status === "APPLIED") return { id: target.id, applied: true };
    const content = await tx.marketingContent.findFirst({
      where: { id: target.id, organizationId: ORG, kind: "NEWSLETTER", studioSeriesId: job.seriesId, archivedAt: null },
      include: { versions: { where: { version: target.version } } },
    });
    if (!content || content.version !== target.version || !content.versions[0])
      throw new PolicyError("Newsletter wurde inzwischen geändert. GPT-Antwort bleibt gespeichert; bitte neu öffnen.", 409);
    const source = contentInput.parse(content.versions[0].payload);
    const result = job.result as { reply?: string };
    const next = applyNewsletterEdit(source, JSON.parse(result.reply || ""));
    const changed = JSON.stringify(source) !== JSON.stringify(next);
    if (changed) {
      await verifyNewsletterImageChanges(source, next);
      await saveContentInTx(tx, actor, next, content.id, target.version);
    }
    await tx.studioJob.update({ where: { id }, data: { status: "APPLIED" } });
    await audit(tx, actor, "NEWSLETTER_GPT_APPLIED", content.id, { jobId: id, sourceVersion: target.version, changed });
    return { id: content.id, applied: true, changed };
  }, { timeout: 15000 });
}
