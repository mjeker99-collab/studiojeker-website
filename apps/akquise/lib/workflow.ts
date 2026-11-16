import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "./db";
import { contactInput, type ContactInput } from "./import";
import {
  PolicyError,
  verifiedContact,
  legalAllowed,
  personKey,
  messageHash,
  normalizeEmail,
} from "./policy";
import { generateDraft } from "./generation";
import { renderLocalMessage } from "./mail";
import { randomUUID } from "node:crypto";
export type Tx = Prisma.TransactionClient;
export async function audit(
  tx: Tx,
  userId: string,
  action: string,
  entityId: string,
  detail: Prisma.InputJsonValue = {},
) {
  await tx.audit.create({ data: { userId, action, entityId, detail } });
}
async function actor(tx: Tx, userId: string) {
  if (!(await tx.user.findFirst({ where: { id: userId, active: true } })))
    throw new PolicyError("Keine Berechtigung.", 403);
}
async function lock(tx: Tx, key: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
}
async function invalidate(tx: Tx, contactId: string, userId: string) {
  await tx.approval.updateMany({
    where: { contactId, status: { in: ["PENDING", "APPROVED"] } },
    data: { status: "INVALIDATED" },
  });
  await audit(tx, userId, "APPROVALS_INVALIDATED", contactId);
}
export async function saveContact(
  userId: string,
  raw: unknown,
  id?: string,
  expectedRevision?: number,
) {
  const input = contactInput.parse(raw);
  return db.$transaction(async (tx) => {
    await actor(tx, userId);
    await lock(tx, "contact:" + (id ?? input.email));
    const existing = id
      ? await tx.contact.findUniqueOrThrow({ where: { id } })
      : null;
    if (existing && existing.revision !== expectedRevision)
      throw new PolicyError("Kontakt wurde geändert. Neu laden.", 409);
    const data = {
      ...input,
      publicAuthority:
        input.publicAuthority || input.legalCategory === "PUBLIC_AUTHORITY",
      verifiedAt: input.verifiedAt ? new Date(input.verifiedAt) : null,
      personKey: personKey(input.firstName, input.lastName, input.organisation),
    };
    if (data.confidence === "VERIFIED")
      verifiedContact({ ...data, status: existing?.status ?? "NEW" });
    if (data.newsletterConsent && !data.newsletterEvidence.trim())
      throw new PolicyError(
        "Newsletter-Einwilligung braucht separaten Nachweis.",
      );
    const contact = existing
      ? await tx.contact.update({
          where: { id },
          data: {
            ...data,
            revision: { increment: 1 },
            status:
              existing.status === "DO_NOT_CONTACT"
                ? "DO_NOT_CONTACT"
                : data.confidence === "VERIFIED"
                  ? "VERIFIED"
                  : "NEW",
          },
        })
      : await tx.contact.create({
          data: {
            ...data,
            status: data.confidence === "VERIFIED" ? "VERIFIED" : "NEW",
          },
        });
    if (existing) await invalidate(tx, contact.id, userId);
    await audit(
      tx,
      userId,
      existing ? "CONTACT_UPDATED" : "CONTACT_CREATED",
      contact.id,
      { revision: contact.revision },
    );
    return contact;
  });
}
export async function importContacts(userId: string, rows: ContactInput[]) {
  return db.$transaction(
    async (tx) => {
      await actor(tx, userId);
      const result = { imported: 0, duplicates: 0 };
      for (const c of rows) {
        const key = personKey(c.firstName, c.lastName, c.organisation);
        const duplicate = await tx.contact.findFirst({
          where: { OR: [{ email: c.email }, { personKey: key }] },
        });
        if (duplicate) {
          result.duplicates++;
          continue;
        }
        await tx.contact.create({
          data: {
            ...c,
            verifiedAt: null,
            confidence: "UNCONFIRMED",
            status: "NEW",
            newsletterConsent: false,
            newsletterEvidence: "",
            personKey: key,
          },
        });
        result.imported++;
      }
      await audit(tx, userId, "CONTACT_IMPORT", "import", result);
      return result;
    },
    { timeout: 20000 },
  );
}
export async function newDraft(userId: string, contactId: string) {
  return db.$transaction(async (tx) => {
    await actor(tx, userId);
    await lock(tx, "contact:" + contactId);
    const c = await tx.contact.findUniqueOrThrow({ where: { id: contactId } });
    if (await tx.suppression.findUnique({ where: { email: c.email } }))
      throw new PolicyError("Adresse auf Sperrliste.");
    const generated = await generateDraft(c);
    const draft = await tx.draft.create({ data: { contactId } });
    await tx.draftVersion.create({
      data: {
        draftId: draft.id,
        version: 1,
        recipient: c.email,
        ...generated,
        hash: messageHash(c.email, generated.subject, generated.body),
        contactRevision: c.revision,
        authorId: userId,
      },
    });
    await tx.contact.update({
      where: { id: contactId },
      data: { status: "DRAFT" },
    });
    await audit(tx, userId, "DRAFT_CREATED", draft.id, {
      version: 1,
      provider: "local-template",
    });
    return draft;
  });
}
export async function editDraft(
  userId: string,
  id: string,
  version: number,
  input: { recipient: string; subject: string; body: string },
) {
  return db.$transaction(async (tx) => {
    await actor(tx, userId);
    const d = await tx.draft.findUniqueOrThrow({ where: { id } });
    await lock(tx, "contact:" + d.contactId);
    const current = await tx.draft.findUniqueOrThrow({
      where: { id },
      include: { contact: true },
    });
    if (current.version !== version)
      throw new PolicyError("Entwurf wurde geändert. Neu laden.", 409);
    const recipient = normalizeEmail(input.recipient);
    if (recipient !== current.contact.email)
      throw new PolicyError(
        "Empfänger zuerst am Kontakt ändern und verifizieren.",
      );
    const next = version + 1;
    await tx.draftVersion.create({
      data: {
        draftId: id,
        version: next,
        ...input,
        recipient,
        hash: messageHash(recipient, input.subject, input.body),
        contactRevision: current.contact.revision,
        authorId: userId,
      },
    });
    await tx.draft.update({ where: { id }, data: { version: next } });
    await invalidate(tx, d.contactId, userId);
    await tx.contact.update({
      where: { id: d.contactId },
      data: { status: "DRAFT" },
    });
    await audit(tx, userId, "DRAFT_VERSION_CREATED", id, { version: next });
  });
}
export async function reviewDraft(
  userId: string,
  id: string,
  version: number,
  decision: "PENDING" | "APPROVED" | "REJECTED",
  read: boolean,
) {
  return db.$transaction(async (tx) => {
    await actor(tx, userId);
    const initial = await tx.draft.findUniqueOrThrow({ where: { id } });
    await lock(tx, "contact:" + initial.contactId);
    const d = await tx.draft.findUniqueOrThrow({
      where: { id },
      include: { contact: true },
    });
    if (d.version !== version)
      throw new PolicyError("Entwurf wurde geändert. Neu laden.", 409);
    const v = await tx.draftVersion.findUniqueOrThrow({
      where: { draftId_version: { draftId: id, version } },
    });
    if (decision !== "REJECTED") {
      verifiedContact(d.contact);
      if (
        v.contactRevision !== d.contact.revision ||
        v.recipient !== d.contact.email
      )
        throw new PolicyError("Kontakt geändert. Entwurf neu speichern.");
      if (await tx.suppression.findUnique({ where: { email: v.recipient } }))
        throw new PolicyError("Adresse auf Sperrliste.");
    }
    if (decision === "APPROVED") {
      if (!read) throw new PolicyError("Vollständiges Lesen bestätigen.");
      const legal = await tx.legalReview.findFirst({
        where: { contactId: d.contactId },
        orderBy: { createdAt: "desc" },
      });
      legalAllowed(legal, d.contact.revision, d.contact.publicAuthority);
    }
    await tx.approval.updateMany({
      where: { draftId: id, status: { in: ["PENDING", "APPROVED"] } },
      data: { status: "INVALIDATED" },
    });
    await tx.approval.create({
      data: {
        draftId: id,
        contactId: d.contactId,
        version,
        hash: v.hash,
        userId,
        status: decision,
      },
    });
    await tx.contact.update({
      where: { id: d.contactId },
      data: { status: decision === "PENDING" ? "IN_REVIEW" : decision },
    });
    await audit(tx, userId, "DRAFT_" + decision, id, {
      version,
      hash: v.hash,
      contactId: d.contactId,
    });
  });
}
export async function legalReview(
  userId: string,
  contactId: string,
  revision: number,
  allowed: boolean,
  rationale: string,
  procurementReviewed: boolean,
) {
  return db.$transaction(async (tx) => {
    await actor(tx, userId);
    await lock(tx, "contact:" + contactId);
    const c = await tx.contact.findUniqueOrThrow({ where: { id: contactId } });
    if (c.revision !== revision)
      throw new PolicyError("Kontakt geändert. Neu laden.", 409);
    if (allowed && c.publicAuthority && !procurementReviewed)
      throw new PolicyError("Beschaffungsrecht separat prüfen.");
    await tx.legalReview.create({
      data: {
        contactId,
        contactRevision: revision,
        allowed,
        rationale,
        procurementReviewed,
        userId,
      },
    });
    await invalidate(tx, contactId, userId);
    await audit(tx, userId, "LEGAL_REVIEW", contactId, {
      allowed,
      rationale,
      revision,
      procurementReviewed,
    });
  });
}
export async function suppress(userId: string, email: string, reason: string) {
  return db.$transaction(async (tx) => {
    await actor(tx, userId);
    await lock(tx, "delivery-global");
    const normalized = normalizeEmail(email);
    const contacts = await tx.contact.findMany({
      where: { email: normalized },
    });
    for (const c of contacts) {
      await lock(tx, "contact:" + c.id);
      await invalidate(tx, c.id, userId);
      await tx.contact.update({
        where: { id: c.id },
        data: { status: "DO_NOT_CONTACT" },
      });
    }
    await tx.suppression.upsert({
      where: { email: normalized },
      create: { email: normalized, reason, userId },
      update: { reason, userId },
    });
    await audit(tx, userId, "SUPPRESSION_ADDED", normalized, { reason });
  });
}
export async function simulate(
  userId: string,
  id: string,
  version: number,
  client: PrismaClient = db,
) {
  return client.$transaction(async (tx) => {
    await actor(tx, userId);
    await lock(tx, "delivery-global");
    const initial = await tx.draft.findUniqueOrThrow({ where: { id } });
    await lock(tx, "contact:" + initial.contactId);
    const d = await tx.draft.findUniqueOrThrow({
      where: { id },
      include: { contact: true },
    });
    if (d.version !== version) throw new PolicyError("Veraltete Version.", 409);
    const v = await tx.draftVersion.findUniqueOrThrow({
      where: { draftId_version: { draftId: id, version } },
    });
    verifiedContact(d.contact);
    if (
      v.contactRevision !== d.contact.revision ||
      v.recipient !== d.contact.email
    )
      throw new PolicyError("Kontakt geändert.");
    if (await tx.suppression.findUnique({ where: { email: v.recipient } }))
      throw new PolicyError("Adresse auf Sperrliste.");
    const approval = await tx.approval.findFirst({
      where: { draftId: id, version, hash: v.hash, status: "APPROVED" },
    });
    if (!approval) throw new PolicyError("Freigabe der exakten Version fehlt.");
    const legal = await tx.legalReview.findFirst({
      where: { contactId: d.contactId },
      orderBy: { createdAt: "desc" },
    });
    legalAllowed(legal, d.contact.revision, d.contact.publicAuthority);
    const key = `simulation:${id}:${version}`;
    const prior = await tx.delivery.findUnique({
      where: { idempotencyKey: key },
    });
    if (prior) return { delivery: prior, reused: true };
    if (
      await tx.delivery.findFirst({
        where: {
          recipient: v.recipient,
          status: { in: ["SIMULATED", "SENT", "SEND_READY", "REPLIED"] },
        },
      })
    )
      throw new PolicyError(
        "Doppelversand blockiert; bereits simuliert oder versandt.",
        409,
      );
    const limit = Number(process.env.DAILY_SEND_LIMIT ?? 20);
    if (!Number.isInteger(limit) || limit < 1 || limit > 500)
      throw new PolicyError("Ungültiges Tageslimit.");
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    if (
      (await tx.delivery.count({
        where: {
          createdAt: { gte: since },
          status: { in: ["SIMULATED", "SENT", "SEND_READY"] },
        },
      })) >= limit
    )
      throw new PolicyError("Tageslimit erreicht.");
    const messageId = `<${randomUUID()}@akquise.studiojeker.ch>`;
    await renderLocalMessage({ ...v, messageId });
    const delivery = await tx.delivery.create({
      data: {
        draftId: id,
        version,
        recipient: v.recipient,
        hash: v.hash,
        status: "SIMULATED",
        messageId,
        idempotencyKey: key,
      },
    });
    await audit(tx, userId, "LOCAL_SIMULATION", delivery.id, {
      messageId,
      version,
    });
    return { delivery, reused: false };
  });
}
