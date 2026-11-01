import { z } from "zod";
import { db } from "./db";
import { hubActor } from "./hub/workflow";
import { PolicyError } from "./policy";
import { ORG } from "./studio/input";
import { audit } from "./workflow";
import { customerKnowledgeSchema } from "./customer-knowledge";

const customerInput = z
  .object({
    name: z.string().trim().min(1).max(250),
    website: z.union([
      z.literal(""),
      z
        .string()
        .url()
        .max(2000)
        .refine((value) => {
          const url = new URL(value);
          return url.protocol === "https:" && !url.username && !url.password;
        }),
    ]),
    contactName: z.string().trim().max(200),
    contactEmail: z.union([z.literal(""), z.email().max(254)]),
    notes: z.string().trim().max(5000),
    status: z.enum(["ACTIVE", "INACTIVE"]),
    // Older clients may omit the field; keep existing knowledge on updates.
    knowledge: customerKnowledgeSchema.optional(),
  })
  .strict();

export async function customerState(actor: string) {
  await db.$transaction((tx) => hubActor(tx, actor));
  return db.customer.findMany({
    where: { organizationId: ORG },
    orderBy: { name: "asc" },
    include: { _count: { select: { campaigns: true, series: true } } },
  });
}

export async function saveCustomer(actor: string, raw: unknown, id?: string) {
  const envelope = id
    ? z
        .object({ revision: z.number().int().positive(), data: customerInput })
        .strict()
        .parse(raw)
    : null;
  const data = envelope?.data ?? customerInput.parse(raw);
  return db.$transaction(async (tx) => {
    await hubActor(tx, actor);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"customers:" + ORG}))`;
    if (id) {
      const updated = await tx.customer.updateMany({
        where: { id, organizationId: ORG, revision: envelope!.revision },
        data: { ...data, revision: { increment: 1 } },
      });
      if (!updated.count)
        throw new PolicyError("Kunde wurde geändert. Neu laden.", 409);
      await audit(tx, actor, "CUSTOMER_UPDATED", id, {
        revision: envelope!.revision + 1,
      });
      return tx.customer.findUniqueOrThrow({ where: { id } });
    }
    const customer = await tx.customer.create({
      data: { ...data, organizationId: ORG },
    });
    await audit(tx, actor, "CUSTOMER_CREATED", customer.id, {});
    return customer;
  });
}

// Match companies by their full name; never merge unrelated companies merely
// because they share a website host or a general contact mailbox.
function customerKey(name: string) {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("de-CH");
}

export async function customerMasterlist(actor: string) {
  await db.$transaction((tx) => hubActor(tx, actor));
  const [contacts, customers] = await Promise.all([
    db.contact.findMany({
      where: { organizationId: ORG },
      orderBy: [{ organisation: "asc" }, { id: "asc" }],
      select: {
        id: true,
        organisation: true,
        firstName: true,
        lastName: true,
        email: true,
        website: true,
      },
    }),
    db.customer.findMany({
      where: { organizationId: ORG },
      select: { name: true },
    }),
  ]);
  const existing = new Set(customers.map((c) => customerKey(c.name)));
  return contacts.map((c) => ({
    ...c,
    existing: existing.has(customerKey(c.organisation)),
  }));
}

export async function importCustomers(actor: string, raw: unknown) {
  const { contactIds } = z
    .object({
      contactIds: z.array(z.string().min(1).max(100)).min(1).max(5000),
    })
    .strict()
    .parse(raw);
  const ids = [...new Set(contactIds)];
  return db.$transaction(
    async (tx) => {
      await hubActor(tx, actor);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"customers:" + ORG}))`;
      const contacts = await tx.contact.findMany({
        where: { organizationId: ORG, id: { in: ids } },
      });
      if (contacts.length !== ids.length)
        throw new PolicyError(
          "Die Auswahl hat sich geändert. Masterliste neu laden.",
          409,
        );
      const existing = new Set(
        (
          await tx.customer.findMany({
            where: { organizationId: ORG },
            select: { name: true },
          })
        ).map((c) => customerKey(c.name)),
      );
      const byId = new Map(contacts.map((c) => [c.id, c]));
      let skipped = 0;
      const data = [];
      for (const id of ids) {
        const c = byId.get(id)!;
        const key = customerKey(c.organisation);
        if (existing.has(key)) {
          skipped++;
          continue;
        }
        existing.add(key);
        let website = "";
        try {
          const url = new URL(c.website);
          if (
            ["http:", "https:"].includes(url.protocol) &&
            !url.username &&
            !url.password
          ) {
            url.protocol = "https:";
            website = url.toString();
          }
        } catch {
          /* An unknown website stays empty and can be added later. */
        }
        data.push({
          organizationId: ORG,
          name: c.organisation.trim(),
          website,
          contactName: [c.firstName, c.lastName].filter(Boolean).join(" "),
          contactEmail: c.email,
          notes: c.notes,
          status: "ACTIVE",
        });
      }
      if (data.length) await tx.customer.createMany({ data });
      await audit(tx, actor, "CUSTOMERS_IMPORTED", ORG, {
        created: data.length,
        skipped,
        contactIds: ids,
      });
      return { created: data.length, skipped };
    },
    { timeout: 30000 },
  );
}
