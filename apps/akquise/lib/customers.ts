import { z } from "zod";
import { db } from "./db";
import { hubActor } from "./hub/workflow";
import { PolicyError } from "./policy";
import { ORG } from "./studio/input";
import { audit } from "./workflow";
import { customerKnowledgeSchema } from "./customer-knowledge";

const customerInput = z
  .object({
    name: z.string().trim().min(1).max(200),
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
