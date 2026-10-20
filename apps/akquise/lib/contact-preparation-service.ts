import { z } from "zod";
import { db } from "./db";
import { contactInput } from "./import";
import { contactPreparation } from "./contact-preparation";
import { PolicyError } from "./policy";
import { saveContact, newDraft } from "./workflow";
import { allowedAccount } from "./config.mjs";

const idsInput = z
  .object({ ids: z.array(z.string().min(1).max(100)).min(1).max(200) })
  .strict();
const applyInput = z
  .object({
    confirmed: z.literal(true),
    contacts: z
      .array(
        z
          .object({
            id: z.string().min(1).max(100),
            revision: z.number().int().positive(),
          })
          .strict(),
      )
      .min(1)
      .max(200),
  })
  .strict();
export async function prepareContacts(
  userId: string,
  action: string,
  raw: unknown,
) {
  const user = await db.user.findFirst({ where: { id: userId, active: true } });
  if (!user || !allowedAccount(user))
    throw new PolicyError("Keine Berechtigung.", 403);
  if (action === "preview") {
    const { ids } = idsInput.parse(raw);
    const contacts = await db.contact.findMany({ where: { id: { in: ids } } });
    const suppressed = new Set(
      (
        await db.suppression.findMany({
          where: { email: { in: contacts.map((c) => c.email) } },
          select: { email: true },
        })
      ).map((s) => s.email),
    );
    return {
      contacts: [...new Set(ids)].map((id) => {
        const c = contacts.find((item) => item.id === id);
        if (!c) throw new PolicyError("Kontakt fehlt. Auswahl neu laden.", 409);
        const p = contactPreparation(c);
        if (suppressed.has(c.email)) {
          p.issues.push("Adresse auf Sperrliste.");
          p.ready = false;
        }
        return p;
      }),
    };
  }
  if (action === "apply") {
    const data = applyInput.parse(raw);
    const results = [];
    for (const item of data.contacts.filter(
      (c, i, a) => a.findIndex((v) => v.id === c.id) === i,
    )) {
      try {
        const c = await db.contact.findUnique({ where: { id: item.id } });
        if (!c || c.revision !== item.revision)
          throw new PolicyError(
            "Kontakt wurde geändert. Vorschau neu laden.",
            409,
          );
        if (await db.suppression.findUnique({ where: { email: c.email } }))
          throw new PolicyError("Adresse auf Sperrliste.");
        const p = contactPreparation(c);
        if (!p.ready) throw new PolicyError(p.issues.join(" "));
        if (p.changed) {
          // Explicit field allowlist; never copy Prisma fields, approvals or
          // newsletter metadata from notes into the contact update.
          const original = Object.fromEntries(
            Object.keys(contactInput.shape).map((key) => [
              key,
              key === "verifiedAt"
                ? (c.verifiedAt?.toISOString() ?? "")
                : c[key as keyof typeof c],
            ]),
          );
          await saveContact(
            userId,
            { ...original, ...p.patch },
            c.id,
            item.revision,
          );
        }
        results.push({
          id: item.id,
          ok: true,
          message: p.changed
            ? "Prüfdaten übernommen."
            : "Prüfdaten bereits vollständig.",
        });
      } catch (error) {
        if (!(error instanceof PolicyError)) throw error;
        results.push({ id: item.id, ok: false, message: error.message });
      }
    }
    return { results };
  }
  if (action === "drafts") {
    const { ids } = idsInput.parse(raw);
    const results = [];
    for (const id of new Set(ids)) {
      try {
        const draft = await newDraft(userId, id, true);
        results.push({
          id,
          ok: true,
          message:
            "Entwurf bereit (vorhandener aktueller Entwurf wird wiederverwendet).",
          draftId: draft.id,
        });
      } catch (error) {
        if (!(error instanceof PolicyError)) throw error;
        results.push({ id, ok: false, message: error.message });
      }
    }
    return { results };
  }
  throw new PolicyError("Nicht gefunden.", 404);
}
