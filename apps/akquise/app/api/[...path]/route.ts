import { studioState } from "@/lib/studio/service";
import { studioMutation } from "@/lib/studio/api";
import { readAsset, storeAsset, MAX_UPLOAD } from "@/lib/studio/assets";
import { logoBytes } from "@/lib/studio/config";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z, ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { login, requireUser, tokenHash } from "@/lib/auth";
import { PolicyError } from "@/lib/policy";
import { appOrigin, sessionCookieName, readMailConfig } from "@/lib/config.mjs";
import { dispatchApproved } from "@/lib/delivery";
import { parseImport } from "@/lib/import";
import {
  saveContact,
  importContacts,
  newDraft,
  editDraft,
  reviewDraft,
  legalReview,
  suppress,
  simulate,
  audit,
} from "@/lib/workflow";
import { hubState, hubMutation } from "@/lib/hub/api";
import { readSheetContacts } from "@/lib/sheets";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const draftSchema = z
  .object({
    version: z.number().int().positive(),
    recipient: z.string().email().max(254),
    subject: z
      .string()
      .trim()
      .min(1)
      .max(250)
      .refine((v) => !/[\r\n]/.test(v)),
    body: z.string().trim().min(1).max(12000),
  })
  .strict();
async function boundedBody(req: NextRequest, max: number) {
  const reader = req.body?.getReader();
  if (!reader) throw new PolicyError("Anfrage ohne Inhalt.");
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > max) {
        await reader.cancel();
        throw new PolicyError("Anfrage zu gross.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}
async function jsonBody(req: NextRequest) {
  try {
    return JSON.parse((await boundedBody(req, 64000)).toString("utf8"));
  } catch (e) {
    if (e instanceof PolicyError) throw e;
    throw new PolicyError("Ungültiges JSON.");
  }
}
async function handler(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await context.params;
    const route = path.join("/");
    if (req.method !== "GET") {
      const expected = appOrigin();
      if (req.headers.get("origin") !== expected)
        throw new PolicyError("Ungültiger Anfrage-Ursprung.", 403);
    }
    if (route === "login" && req.method === "POST") {
      const data = z
        .object({
          email: z.string().email().max(254),
          password: z.string().min(1).max(256),
        })
        .strict()
        .parse(await jsonBody(req));
      const result = await login(data.email, data.password);
      if ("error" in result) throw new PolicyError(result.error!, 401);
      (await cookies()).set(sessionCookieName(), result.token!, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        expires: result.expiresAt,
      });
      return NextResponse.json({ ok: true });
    }
    const user = await requireUser();
    if (route === "studio/state" && req.method === "GET")
      return NextResponse.json(await studioState(user.id));
    if (route === "studio/logo" && req.method === "GET")
      return new NextResponse(new Uint8Array(logoBytes()), {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "no-store, private",
        },
      });
    if (
      path[0] === "studio" &&
      path[1] === "assets" &&
      path.length === 3 &&
      req.method === "GET"
    ) {
      const { asset, bytes } = await readAsset(user.id, path[2]);
      return new NextResponse(new Uint8Array(bytes), {
        headers: {
          "Content-Type": asset.mime,
          "Cache-Control": "no-store, private",
          "X-Content-Type-Options": "nosniff",
          "Content-Disposition": `${req.nextUrl.searchParams.has("download") ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(asset.name)}`,
        },
      });
    }
    if (route === "studio/upload" && req.method === "POST") {
      const kind =
        req.headers.get("x-studio-kind") === "FONT" ? "FONT" : "ORIGINAL";
      if (req.headers.get("x-rights-confirmed") !== "true")
        throw new PolicyError("Nutzungsrechte an der Datei bestätigen.");
      const bytes = await boundedBody(req, MAX_UPLOAD);
      const a = await storeAsset(
        user.id,
        bytes,
        decodeURIComponent(req.headers.get("x-file-name") || "datei"),
        kind,
      );
      return NextResponse.json(a);
    }
    if (route === "hub/state" && req.method === "GET")
      return NextResponse.json(await hubState());
    if (route === "logout" && req.method === "POST") {
      const jar = await cookies();
      const token = jar.get(sessionCookieName())?.value;
      if (token)
        await db.session.deleteMany({ where: { id: tokenHash(token) } });
      jar.delete(sessionCookieName());
      return NextResponse.json({ ok: true });
    }
    if (route === "state" && req.method === "GET") {
      const [contacts, drafts, deliveries, suppressions, audits, users] =
        await Promise.all([
          db.contact.findMany({
            orderBy: { updatedAt: "desc" },
            take: 1000,
            include: {
              legalReviews: { orderBy: { createdAt: "desc" }, take: 1 },
            },
          }),
          db.draft.findMany({
            orderBy: { updatedAt: "desc" },
            take: 1000,
            include: {
              versions: { orderBy: { version: "desc" } },
              approvals: {
                orderBy: { createdAt: "desc" },
                include: { user: { select: { name: true } } },
              },
            },
          }),
          db.delivery.findMany({ orderBy: { createdAt: "desc" }, take: 500 }),
          db.suppression.findMany({
            orderBy: { createdAt: "desc" },
            take: 1000,
          }),
          db.audit.findMany({
            orderBy: { createdAt: "desc" },
            take: 100,
            include: { user: { select: { name: true } } },
          }),
          db.user.findMany({ select: { id: true, name: true } }),
        ]);
      return NextResponse.json({
        user: { id: user.id, name: user.name },
        contacts,
        drafts,
        deliveries,
        suppressions,
        audits,
        users,
        externalSending: readMailConfig().smtpAllowed,
        mailMode: readMailConfig().mode,
        smtpPort: readMailConfig().port || null,
        smtpSecure: readMailConfig().secure,
        generator: "Lokale Vorlage · KI-Schnittstelle vorbereitet",
      });
    }
    if (req.method !== "POST") throw new PolicyError("Nicht gefunden.", 404);
    if (route === "contacts/import") {
      if (Number(req.headers.get("content-length")) > 2200000)
        throw new PolicyError("Datei zu gross.", 413);
      const bytes = await boundedBody(req, 2200000);
      const form = await new Response(new Uint8Array(bytes), {
        headers: { "Content-Type": req.headers.get("content-type") ?? "" },
      }).formData();
      const file = form.get("file");
      if (!(file instanceof File) || file.size > 2097152)
        throw new PolicyError("Datei fehlt oder ist zu gross.");
      const rows = await parseImport(
        Buffer.from(await file.arrayBuffer()),
        file.name,
      );
      return NextResponse.json(await importContacts(user.id, rows));
    }
    if (route === "contacts/sheets") {
      const rows = await readSheetContacts();
      return NextResponse.json(await importContacts(user.id, rows));
    }
    if (Number(req.headers.get("content-length")) > 64000)
      throw new PolicyError("Anfrage zu gross.", 413);
    const body: unknown = await jsonBody(req);
    if (path[0] === "studio")
      return NextResponse.json(await studioMutation(user.id, path, body));
    if (path[0] === "hub") {
      const result = await hubMutation(user.id, path, body);
      if (result !== null) return NextResponse.json(result);
      throw new PolicyError("Nicht gefunden.", 404);
    }
    if (route === "contacts") {
      return NextResponse.json(await saveContact(user.id, body));
    }
    if (path[0] === "contacts" && path.length === 2) {
      const data = z
        .object({ revision: z.number().int().positive(), contact: z.unknown() })
        .strict()
        .parse(body);
      return NextResponse.json(
        await saveContact(user.id, data.contact, path[1], data.revision),
      );
    }
    if (route === "drafts") {
      const data = z.object({ contactId: z.string() }).strict().parse(body);
      return NextResponse.json(await newDraft(user.id, data.contactId));
    }
    if (path[0] === "drafts" && path.length === 2) {
      const { version, ...input } = draftSchema.parse(body);
      await editDraft(user.id, path[1], version, input);
      return NextResponse.json({ ok: true });
    }
    if (path[0] === "review" && path.length === 2) {
      const data = z
        .object({
          version: z.number().int().positive(),
          decision: z.enum(["PENDING", "APPROVED", "REJECTED"]),
          read: z.boolean(),
        })
        .strict()
        .parse(body);
      await reviewDraft(
        user.id,
        path[1],
        data.version,
        data.decision,
        data.read,
      );
      return NextResponse.json({ ok: true });
    }
    if (route === "legal") {
      const d = z
        .object({
          contactId: z.string(),
          revision: z.number().int().positive(),
          allowed: z.boolean(),
          rationale: z.string().trim().min(15).max(4000),
          procurementReviewed: z.boolean(),
        })
        .strict()
        .parse(body);
      await legalReview(
        user.id,
        d.contactId,
        d.revision,
        d.allowed,
        d.rationale,
        d.procurementReviewed,
      );
      return NextResponse.json({ ok: true });
    }
    if (route === "suppression") {
      const d = z
        .object({
          email: z.string().email(),
          reason: z.string().trim().min(3).max(1000),
        })
        .strict()
        .parse(body);
      await suppress(user.id, d.email, d.reason);
      return NextResponse.json({ ok: true });
    }
    if (route === "simulate") {
      const d = z
        .object({ draftId: z.string(), version: z.number().int().positive() })
        .strict()
        .parse(body);
      return NextResponse.json(await simulate(user.id, d.draftId, d.version));
    }
    if (route === "send") {
      if (!readMailConfig().smtpAllowed) {
        await audit(db, user.id, "SEND_BLOCKED", "configuration", {});
        throw new PolicyError("Externer E-Mail-Versand ist deaktiviert.", 403);
      }
      const d = z
        .object({
          draftId: z.string(),
          version: z.number().int().positive(),
          confirmDispatch: z.literal(true),
        })
        .strict()
        .parse(body);
      return NextResponse.json(
        await dispatchApproved(user.id, d.draftId, d.version),
      );
    }
    throw new PolicyError("Nicht gefunden.", 404);
  } catch (error) {
    if (error instanceof PolicyError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    if (error instanceof ZodError)
      return NextResponse.json(
        {
          error: error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
        },
        { status: 400 },
      );
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      return NextResponse.json(
        {
          error:
            "Dublette: E-Mail-Adresse oder Person und Organisation bereits vorhanden.",
        },
        { status: 409 },
      );
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    )
      return NextResponse.json(
        { error: "Eintrag nicht gefunden." },
        { status: 404 },
      );
    console.error(
      "Akquise request failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json(
      {
        error:
          "Anfrage nicht verarbeitet. Format und Datenbankverbindung prüfen.",
      },
      { status: 500 },
    );
  }
}
export { handler as GET, handler as POST };
