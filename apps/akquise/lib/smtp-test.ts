import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { db } from "./db";
import { allowedAccount, readMailConfig } from "./config.mjs";
import { PolicyError } from "./policy";
import { smtpSender, type SmtpSender } from "./mail";

const input = z
  .object({
    confirmed: z.literal(true),
    requestId: z.string().uuid(),
    draft: z
      .object({ id: z.string().min(1), version: z.number().int().positive() })
      .strict()
      .optional(),
  })
  .strict();
const recipient = "njeker@studiojeker.ch";

// A configuration test has no prospect, draft or prospect approval attached.
export async function sendInternalSmtpTest(
  userId: string,
  raw: unknown,
  sender: SmtpSender = smtpSender,
  client: PrismaClient = db,
) {
  const { requestId, draft } = input.parse(raw);
  const config = readMailConfig();
  if (
    (config.mode !== "test" && !(draft && config.mode === "production")) ||
    !config.smtpAllowed ||
    (config.mode === "test" && !config.testRecipients.includes(recipient))
  )
    throw new PolicyError(
      "Interner SMTP-Testmodus mit njeker@studiojeker.ch als Testempfänger erforderlich.",
    );
  const entityId = `smtp-test:${requestId}`;
  const snapshot = await client.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('smtp-configuration-test'))`;
    const user = await tx.user.findFirst({
      where: { id: userId, active: true },
    });
    if (!user || !allowedAccount(user))
      throw new PolicyError("Keine Berechtigung.", 403);
    if (
      await tx.audit.findFirst({
        where: { entityId, action: "SMTP_TEST_STARTED" },
      })
    )
      throw new PolicyError(
        "Dieser Test wurde bereits gestartet. Postfach und Audit-Protokoll prüfen.",
        409,
      );
    if (
      await tx.audit.findFirst({
        where: {
          action: "SMTP_TEST_STARTED",
          createdAt: { gte: new Date(Date.now() - 60000) },
        },
      })
    )
      throw new PolicyError(
        "Bitte eine Minute bis zum nächsten Test warten.",
        429,
      );
    const version = draft
      ? await tx.draftVersion.findUnique({
          where: {
            draftId_version: { draftId: draft.id, version: draft.version },
          },
          include: { draft: true },
        })
      : null;
    if (draft && (!version || version.draft.version !== draft.version))
      throw new PolicyError("Mail wurde geändert. Vorschau neu laden.", 409);
    await tx.audit.create({
      data: {
        userId,
        entityId,
        action: "SMTP_TEST_STARTED",
        detail: {
          recipient,
          ...(draft ? { draftId: draft.id, version: draft.version } : {}),
        },
      },
    });
    return version;
  });
  // Persist before SMTP. An interrupted/uncertain send is never retried automatically.
  try {
    const result = await sender({
      recipient,
      envelopeRecipients: [recipient],
      test: true,
      messageId: `<smtp-test-${requestId}@akquise.studiojeker.ch>`,
      subject: snapshot?.subject ?? "StudioONE – SMTP-Verbindungstest",
      body:
        snapshot?.body ??
        "Guten Tag\n\nDies ist eine interne Testmail aus StudioONE. Sie prüft die Zustellung über das Metanet-Postfach njeker@studiojeker.ch.\n\nEs wurden keine Akquisekontakte angeschrieben oder freigegeben.\n\nFreundliche Grüsse\nStudioONE",
    });
    if (
      result.rejected.length ||
      !result.accepted.some((email) => email.toLowerCase() === recipient)
    )
      throw new Error("Not accepted");
    await client.audit.create({
      data: {
        userId,
        entityId,
        action: "SMTP_TEST_ACCEPTED",
        detail: { recipient },
      },
    });
    return {
      message:
        "Testmail von Metanet angenommen. Bitte Posteingang und Spamordner von njeker@studiojeker.ch prüfen.",
    };
  } catch {
    await client.audit.create({
      data: {
        userId,
        entityId,
        action: "SMTP_TEST_UNCERTAIN",
        detail: { recipient },
      },
    });
    throw new PolicyError(
      "Zustellung des Tests nicht bestätigt. Bitte Postfach und Audit-Protokoll prüfen; der Test wird nicht automatisch wiederholt.",
      502,
    );
  }
}
