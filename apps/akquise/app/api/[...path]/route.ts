import { dashboardState } from "@/lib/dashboard";
import { projectDrafts, saveProjectDraft } from "@/lib/projects/service";
import {
  websiteList,
  websiteState,
  websiteVersion,
  websiteMutation,
} from "@/lib/websites/service";
import { websiteExport } from "@/lib/websites/publication";
import { assistCustomer } from "@/lib/customer-assistant/service";
import { conceptState, conceptMutation } from "@/lib/concepts/service";
import { sendInternalSmtpTest } from "@/lib/smtp-test";
import { conceptInput } from "@/lib/concepts/input";
import { conceptDocx, conceptHtml } from "@/lib/concepts/export";
import { cmsState, importSanityNewsletter } from "@/lib/cms/service";
import {
  siteCmsOverview,
  siteCmsPage,
  siteCmsPublish,
  siteCmsReplaceMedia,
  siteCmsRequestReview,
  siteCmsSaveDraft,
} from "@/lib/site-cms/service";
import { siteCmsSuggest } from "@/lib/site-cms/suggest";
import {
  libraryState,
  saveLibraryItem,
  archiveItem,
  saveBrand,
} from "@/lib/library/service";
import { studioState } from "@/lib/studio/service";
import { studioMutation } from "@/lib/studio/api";
import { readAsset, storeAsset, MAX_UPLOAD } from "@/lib/studio/assets";
import { logoBytes } from "@/lib/studio/config";
import { NextRequest, NextResponse } from "next/server";
import {
  mailScheduleState,
  mailScheduleMutation,
} from "../../../lib/mail-schedule";
import { cookies } from "next/headers";
import { z, ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { login, requireUser, tokenHash } from "@/lib/auth";
import { PolicyError, messageHash } from "@/lib/policy";
import { appOrigin, sessionCookieName, readMailConfig } from "@/lib/config.mjs";
import { dispatchApproved } from "@/lib/delivery";
import { parseImport } from "@/lib/import";
import { prepareContacts } from "@/lib/contact-preparation-service";
import { mailReview } from "@/lib/mail-review";
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
import { customerState, saveCustomer } from "@/lib/customers";
import { mailchimpAudiences } from "@/lib/hub/mailchimp";
import { readSheetContacts } from "@/lib/sheets";
import {
  begin as beginSocial,
  disconnect as disconnectSocial,
  status as socialStatus,
} from "@/lib/social/service";
import {
  beginDrive,
  chooseDriveFolder,
  disconnectDrive,
  driveStatus,
  listDriveFiles,
  driveImagePreview,
} from "@/lib/drive/service";
import {
  gptConnectorStatus,
  updateGptScopes,
  revokeGptAccess,
  restoreGptAccess,
  setGptShare,
  setGptWriteGrant,
} from "@/lib/gpt-connector/settings";
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
async function jsonBody(req: NextRequest, max = 64000) {
  try {
    return JSON.parse((await boundedBody(req, max)).toString("utf8"));
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
    if (path[0] === "project-drafts" && path.length <= 2) {
      if (req.method === "GET")
        return NextResponse.json(
          await projectDrafts(
            user.id,
            req.nextUrl.searchParams.get("area"),
            path[1],
          ),
        );
      if (req.method === "POST")
        return NextResponse.json(
          await saveProjectDraft(
            user.id,
            await jsonBody(req, 1050000),
            path[1],
          ),
        );
    }

    if (route === "dashboard" && req.method === "GET") {
      return NextResponse.json(await dashboardState(), {
        headers: { "Cache-Control": "no-store, private" },
      });
    }
    if (path[0] === "websites" && req.method === "GET") {
      const headers = {
        "Cache-Control": "no-store, private",
        "X-Content-Type-Options": "nosniff",
      };
      if (path.length === 1)
        return NextResponse.json(await websiteList(user.id), { headers });
      if (path.length === 2)
        return NextResponse.json(await websiteState(user.id, path[1]), {
          headers,
        });
      if (path.length === 3 && ["export", "version"].includes(path[2])) {
        const version = z.coerce
          .number()
          .int()
          .positive()
          .parse(req.nextUrl.searchParams.get("version"));
        const document = await websiteVersion(user.id, path[1], version);
        if (path[2] === "version")
          return NextResponse.json(document, { headers });
        return new NextResponse(
          new Uint8Array(await websiteExport(user.id, document)),
          {
            headers: {
              ...headers,
              "Content-Type": "application/zip",
              "Content-Disposition": `attachment; filename="website-v${version}.zip"`,
            },
          },
        );
      }
      throw new PolicyError("Nicht gefunden.", 404);
    }
    if (route === "mail-schedule" && req.method === "GET")
      return NextResponse.json(await mailScheduleState(), {
        headers: { "Cache-Control": "no-store" },
      });
    if (path[0] === "concepts" && req.method === "GET") {
      if (path.length === 1)
        return NextResponse.json(await conceptState(user.id), {
          headers: { "Cache-Control": "no-store" },
        });
      if (path.length === 2)
        return NextResponse.json(await conceptState(user.id, path[1]), {
          headers: { "Cache-Control": "no-store" },
        });
      if (path.length === 3 && ["docx", "print"].includes(path[2])) {
        const state = await conceptState(user.id, path[1]);
        if (!("versions" in state))
          throw new PolicyError("Konzept fehlt.", 404);
        const version = Number(req.nextUrl.searchParams.get("version"));
        const snapshot = state.versions.find((v) => v.version === version);
        if (!snapshot) throw new PolicyError("Version nicht gefunden.", 404);
        const payload = conceptInput.parse(snapshot.payload);
        const customer = payload.customerId
          ? await db.customer.findFirst({
              where: { id: payload.customerId, organizationId: "studiojeker" },
              select: { name: true },
            })
          : null;
        const approver = snapshot.approvedBy
          ? await db.user.findUnique({
              where: { id: snapshot.approvedBy },
              select: { name: true },
            })
          : null;
        const meta = {
          version,
          customer: customer?.name || "Studiojeker",
          status: snapshot.approvedAt ? "Freigegeben" : "Entwurf",
          author: approver?.name || "",
        };
        const headers = {
          "Cache-Control": "no-store, private",
          "X-Content-Type-Options": "nosniff",
        };
        if (path[2] === "print")
          return new NextResponse(conceptHtml(payload, meta), {
            headers: {
              ...headers,
              "Content-Type": "text/html; charset=utf-8",
              "Content-Security-Policy":
                "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; frame-ancestors 'self'",
            },
          });
        return new NextResponse(
          new Uint8Array(await conceptDocx(payload, meta)),
          {
            headers: {
              ...headers,
              "Content-Type":
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              "Content-Disposition": `attachment; filename="konzept-v${version}.docx"`,
            },
          },
        );
      }
      throw new PolicyError("Nicht gefunden.", 404);
    }
    if (route === "cms/state" && req.method === "GET")
      return NextResponse.json(await cmsState(user.id));
    if (route === "cms/import" && req.method === "POST")
      return NextResponse.json(
        await importSanityNewsletter(user.id, await jsonBody(req)),
      );
    if (path[0] === "site-cms" && req.method === "GET") {
      const headers = { "Cache-Control": "no-store, private" };
      if (path.length === 2 && path[1] === "overview")
        return NextResponse.json(await siteCmsOverview(user.id), { headers });
      if (path.length === 3 && path[1] === "pages")
        return NextResponse.json(await siteCmsPage(user.id, path[2]), {
          headers,
        });
      throw new PolicyError("Nicht gefunden.", 404);
    }
    if (route === "social/status" && req.method === "GET")
      return NextResponse.json(await socialStatus(user.id), {
        headers: { "Cache-Control": "no-store" },
      });
    if (
      path[0] === "social" &&
      path[1] === "connect" &&
      path.length === 3 &&
      req.method === "POST"
    ) {
      const provider = path[2];
      if (provider !== "meta" && provider !== "linkedin")
        throw new PolicyError("Unbekannter Anbieter.", 404);
      const session = (await cookies()).get(sessionCookieName())!.value;
      const auth = await beginSocial(user.id, tokenHash(session), provider);
      const response = NextResponse.json(
        { url: auth.url },
        { headers: { "Cache-Control": "no-store" } },
      );
      response.cookies.set(`studio-social-${provider}`, auth.state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: `/api/social/${provider}`,
        maxAge: 600,
      });
      return response;
    }
    if (route === "social/disconnect" && req.method === "POST") {
      const input = z
        .object({
          provider: z.enum(["FACEBOOK", "INSTAGRAM", "LINKEDIN"]),
          accountId: z.string().min(1).max(200),
        })
        .strict()
        .parse(await jsonBody(req));
      return NextResponse.json(
        await disconnectSocial(user.id, input.provider, input.accountId),
      );
    }
    if (route === "drive/status" && req.method === "GET")
      return NextResponse.json(await driveStatus(user.id), {
        headers: { "Cache-Control": "no-store" },
      });
    if (route === "drive/files" && req.method === "GET")
      return NextResponse.json(
        await listDriveFiles(
          user.id,
          req.nextUrl.searchParams.get("pageToken") || undefined,
          req.nextUrl.searchParams.get("folderId") || undefined,
        ),
        { headers: { "Cache-Control": "no-store" } },
      );
    if (
      path[0] === "drive" &&
      path[1] === "preview" &&
      path.length === 3 &&
      req.method === "GET"
    ) {
      const image = await driveImagePreview(user.id, path[2]);
      return new NextResponse(new Uint8Array(image.bytes), {
        headers: {
          "Content-Type": image.mime,
          "Cache-Control": "no-store, private",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    if (route === "drive/connect" && req.method === "POST") {
      const session = (await cookies()).get(sessionCookieName())!.value;
      const auth = await beginDrive(user.id, tokenHash(session));
      const result = NextResponse.json(
        { url: auth.url },
        { headers: { "Cache-Control": "no-store" } },
      );
      result.cookies.set("studio-drive-state", auth.state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/drive",
        maxAge: 600,
      });
      return result;
    }
    if (route === "drive/disconnect" && req.method === "POST")
      return NextResponse.json(await disconnectDrive(user.id));
    if (route === "drive/folder" && req.method === "POST")
      return NextResponse.json(
        await chooseDriveFolder(user.id, await jsonBody(req)),
      );
    if (route === "library/state" && req.method === "GET")
      return NextResponse.json(await libraryState(user.id));
    if (route === "studio/state" && req.method === "GET")
      return NextResponse.json(
        await studioState(
          user.id,
          req.nextUrl.searchParams.get("seriesId") || undefined,
        ),
        { headers: { "Cache-Control": "no-store" } },
      );
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
          "Content-Security-Policy": "default-src 'none'; sandbox",
          "Content-Disposition": `${req.nextUrl.searchParams.has("download") || !asset.mime.startsWith("image/") ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(asset.name)}`,
        },
      });
    }
    if (route === "studio/upload" && req.method === "POST") {
      const kind =
        req.headers.get("x-studio-kind") === "FONT"
          ? "FONT"
          : req.headers.get("x-studio-kind") === "DOCUMENT"
            ? "DOCUMENT"
            : "ORIGINAL";
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
    if (route === "customers/state" && req.method === "GET")
      return NextResponse.json(await customerState(user.id), {
        headers: { "Cache-Control": "no-store" },
      });
    if (route === "hub/mailchimp/audiences" && req.method === "GET")
      return NextResponse.json(await mailchimpAudiences(user.id), {
        headers: { "Cache-Control": "no-store" },
      });
    if (route === "integrations/gpt/status" && req.method === "GET")
      return NextResponse.json(await gptConnectorStatus(user.id), {
        headers: { "Cache-Control": "no-store" },
      });
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
        drafts: drafts.map((d) => ({
          ...d,
          versions: d.versions.map((v) => ({
            ...v,
            signatureCurrent:
              v.hash === messageHash(v.recipient, v.subject, v.body),
          })),
        })),
        deliveries,
        suppressions,
        audits,
        users,
        externalSending: readMailConfig().smtpAllowed,
        mailMode: readMailConfig().mode,
        smtpPort: readMailConfig().port || null,
        smtpSecure: readMailConfig().secure,
        generator: "Importierter Mailtext, sonst lokale Vorlage",
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
      const rows = await readSheetContacts(user.id);
      return NextResponse.json(await importContacts(user.id, rows));
    }
    const maxJsonBytes =
      path[0] === "contacts" && path[1] === "preparation"
        ? 2 * 1024 * 1024
        : path[0] === "site-cms" && path[1] === "media"
          ? 6_500_000
          : ["concepts", "websites"].includes(path[0])
            ? 512000
            : 64000;
    if (Number(req.headers.get("content-length")) > maxJsonBytes)
      throw new PolicyError("Anfrage zu gross.", 413);
    const body: unknown = await jsonBody(req, maxJsonBytes);
    if (path[0] === "websites")
      return NextResponse.json(await websiteMutation(user.id, path, body), {
        headers: { "Cache-Control": "no-store" },
      });
    if (path[0] === "site-cms" && path.length === 2) {
      const headers = { "Cache-Control": "no-store" };
      if (path[1] === "save")
        return NextResponse.json(await siteCmsSaveDraft(user.id, body), {
          headers,
        });
      if (path[1] === "review")
        return NextResponse.json(await siteCmsRequestReview(user.id, body), {
          headers,
        });
      if (path[1] === "publish")
        return NextResponse.json(await siteCmsPublish(user.id, body), {
          headers,
        });
      if (path[1] === "suggest")
        return NextResponse.json(await siteCmsSuggest(user.id, body), {
          headers,
        });
      if (path[1] === "media")
        return NextResponse.json(await siteCmsReplaceMedia(user.id, body), {
          headers,
        });
      throw new PolicyError("Nicht gefunden.", 404);
    }
    if (path[0] === "mail-review" && path.length === 2)
      return NextResponse.json(await mailReview(user.id, path[1], body), {
        headers: { "Cache-Control": "no-store" },
      });
    if (
      path[0] === "contacts" &&
      path[1] === "preparation" &&
      path.length === 3
    )
      return NextResponse.json(await prepareContacts(user.id, path[2], body), {
        headers: { "Cache-Control": "no-store" },
      });
    if (path[0] === "mail-schedule" && path.length === 2)
      return NextResponse.json(
        await mailScheduleMutation(user.id, path[1], body),
      );
    if (route === "smtp/test")
      return NextResponse.json(await sendInternalSmtpTest(user.id, body));
    if (path[0] === "concepts")
      return NextResponse.json(await conceptMutation(user.id, path, body));
    if (route === "customers/assist")
      return NextResponse.json(await assistCustomer(user.id, body), {
        headers: { "Cache-Control": "no-store" },
      });
    if (route === "customers")
      return NextResponse.json(await saveCustomer(user.id, body));
    if (path[0] === "customers" && path.length === 2)
      return NextResponse.json(await saveCustomer(user.id, body, path[1]));
    if (route === "library/item")
      return NextResponse.json(await saveLibraryItem(user.id, body));
    if (route === "library/archive")
      return NextResponse.json(await archiveItem(user.id, body));
    if (route === "library/brand")
      return NextResponse.json(await saveBrand(user.id, body));
    if (path[0] === "studio")
      return NextResponse.json(await studioMutation(user.id, path, body));
    if (path[0] === "hub") {
      const result = await hubMutation(user.id, path, body);
      if (result !== null) return NextResponse.json(result);
      throw new PolicyError("Nicht gefunden.", 404);
    }
    if (route === "integrations/gpt/scopes")
      return NextResponse.json(await updateGptScopes(user.id, body));
    if (route === "integrations/gpt/revoke")
      return NextResponse.json(await revokeGptAccess(user.id));
    if (route === "integrations/gpt/restore")
      return NextResponse.json(await restoreGptAccess(user.id));
    if (route === "integrations/gpt/share")
      return NextResponse.json(await setGptShare(user.id, body));
    if (route === "integrations/gpt/write-grant")
      return NextResponse.json(await setGptWriteGrant(user.id, body));
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
