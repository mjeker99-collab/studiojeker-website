import { randomBytes, createHash } from "node:crypto";
import { OAuth2Client, CodeChallengeMethod } from "google-auth-library";
import { z } from "zod";
import { db } from "../db";
import { hubActor } from "../hub/workflow";
import { appOrigin, allowedAccount } from "../config.mjs";
import { PolicyError } from "../policy";
import { seal, unseal } from "./crypto";
const scope = "https://www.googleapis.com/auth/drive.readonly";
const folderMime = "application/vnd.google-apps.folder";
export const stateHash = (s: string) =>
  createHash("sha256").update(s).digest("hex");
export const driveId = z.string().regex(/^[A-Za-z0-9_-]{1,200}$/);
export function driveConfigured() {
  return !!(
    process.env.DRIVE_CLIENT_ID &&
    process.env.DRIVE_CLIENT_SECRET &&
    /^[a-f0-9]{64}$/i.test(process.env.DRIVE_TOKEN_ENCRYPTION_KEY || "")
  );
}
function client() {
  if (!driveConfigured())
    throw new PolicyError("Google Drive: Serverkonfiguration fehlt.", 503);
  return new OAuth2Client({
    clientId: process.env.DRIVE_CLIENT_ID,
    clientSecret: process.env.DRIVE_CLIENT_SECRET,
    redirectUri: `${appOrigin()}/api/drive/callback`,
    transporterOptions: { timeout: 20000, retry: false },
  });
}
async function authorize(actor: string) {
  await db.$transaction((tx) => hubActor(tx, actor));
}
export async function driveStatus(actor: string) {
  await authorize(actor);
  const connection = await db.driveConnection.findUnique({
    where: { userId: actor },
    select: { email: true, folderId: true, folderName: true },
  });
  return { configured: driveConfigured(), connection };
}
export async function beginDrive(actor: string, sessionId: string) {
  await authorize(actor);
  const oauth = client();
  const state = randomBytes(32).toString("base64url");
  const pkce = await oauth.generateCodeVerifierAsync();
  await db.$transaction(async (tx) => {
    await tx.driveOAuthState.deleteMany({
      where: { OR: [{ userId: actor }, { expiresAt: { lt: new Date() } }] },
    });
    await tx.driveOAuthState.create({
      data: {
        id: stateHash(state),
        userId: actor,
        sessionId,
        verifier: seal(pkce.codeVerifier, actor),
        expiresAt: new Date(Date.now() + 600000),
      },
    });
  });
  return {
    state,
    url: oauth.generateAuthUrl({
      access_type: "offline",
      scope: [scope],
      prompt: "consent select_account",
      state,
      code_challenge: pkce.codeChallenge,
      code_challenge_method: CodeChallengeMethod.S256,
    }),
  };
}
export async function completeDrive(
  state: string,
  cookie: string,
  code: string | null,
  denied: boolean,
) {
  if (
    !state ||
    state.length > 100 ||
    !cookie ||
    stateHash(state) !== stateHash(cookie)
  )
    throw new PolicyError(
      "Google-Anmeldung ungültig. Bitte neu verbinden.",
      403,
    );
  // Atomic single-use claim. Bind the callback to the initiating live session,
  // even though the application's Strict cookie is absent on Google's redirect.
  const pending = await db.$transaction(async (tx) => {
    const p = await tx.driveOAuthState.findUnique({
      where: { id: stateHash(state) },
    });
    if (!p || !p.verifier || p.expiresAt < new Date())
      throw new PolicyError("Google-Anmeldung abgelaufen.", 403);
    const session = await tx.session.findUnique({
      where: { id: p.sessionId },
      include: { user: true },
    });
    if (
      !session ||
      session.userId !== p.userId ||
      session.expiresAt < new Date() ||
      !session.user.active ||
      !allowedAccount(session.user)
    )
      throw new PolicyError("StudioONE-Sitzung abgelaufen.", 403);
    const removed = await tx.driveOAuthState.updateMany({
      where: { id: p.id, verifier: p.verifier },
      data: { verifier: "" },
    });
    if (removed.count !== 1)
      throw new PolicyError("Google-Anmeldung bereits verarbeitet.", 409);
    return p;
  });
  if (denied)
    throw new PolicyError("Google-Verbindung wurde nicht freigegeben.");
  if (!code || code.length > 4096)
    throw new PolicyError("Google-Anmeldecode fehlt.");
  const oauth = client();
  let tokens;
  try {
    tokens = (
      await oauth.getToken({
        code,
        codeVerifier: unseal(pending.verifier, pending.userId),
      })
    ).tokens;
  } catch {
    throw new PolicyError(
      "Google-Anmeldung fehlgeschlagen. Bitte erneut verbinden.",
      502,
    );
  }
  if (
    !tokens.refresh_token ||
    !tokens.access_token ||
    !tokens.scope?.split(" ").includes(scope)
  )
    throw new PolicyError(
      "Google-Lesezugriff oder dauerhafte Freigabe fehlt. Bitte erneut verbinden.",
      403,
    );
  const profile = await driveFetch(tokens.access_token, "about", {
    fields: "user(emailAddress)",
  });
  const email = z.string().email().parse(profile.user?.emailAddress);
  const encryptedToken = seal(tokens.refresh_token, pending.userId);
  await db.$transaction(async (tx) => {
    await hubActor(tx, pending.userId);
    const session = await tx.session.findUnique({
      where: { id: pending.sessionId },
    });
    if (
      !session ||
      session.userId !== pending.userId ||
      session.expiresAt < new Date()
    )
      throw new PolicyError("StudioONE-Sitzung abgelaufen.", 403);
    const claimed = await tx.driveOAuthState.deleteMany({
      where: { id: pending.id, verifier: "", expiresAt: { gt: new Date() } },
    });
    if (claimed.count !== 1)
      throw new PolicyError(
        "Google-Verbindung wurde inzwischen geändert.",
        409,
      );
    await tx.driveConnection.upsert({
      where: { userId: pending.userId },
      create: {
        userId: pending.userId,
        email,
        encryptedToken,
      },
      update: {
        email,
        encryptedToken,
        folderId: null,
        folderName: null,
      },
    });
  });
}
async function access(actor: string) {
  await authorize(actor);
  const c = await db.driveConnection.findUnique({ where: { userId: actor } });
  if (!c) throw new PolicyError("Bitte zuerst Google Drive verbinden.", 409);
  const oauth = client();
  oauth.setCredentials({ refresh_token: unseal(c.encryptedToken, actor) });
  try {
    const token = (await oauth.getAccessToken()).token;
    if (!token) throw new Error();
    return { token, connection: c };
  } catch {
    throw new PolicyError(
      "Google-Freigabe abgelaufen oder nicht erreichbar. Bitte erneut verbinden.",
      503,
    );
  }
}
async function driveFetch(
  token: string,
  path: string,
  params: Record<string, string>,
) {
  const url = new URL(`https://www.googleapis.com/drive/v3/${path}`);
  url.search = new URLSearchParams(params).toString();
  let r;
  try {
    r = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    });
  } catch {
    throw new PolicyError("Google Drive ist momentan nicht erreichbar.", 502);
  }
  if (!r.ok)
    throw new PolicyError(
      `Google Drive meldet HTTP ${r.status}. Freigabe und aktivierte Drive API prüfen.`,
      502,
    );
  return r.json();
}
export function parseFolder(value: string) {
  if (value.startsWith("https://")) {
    const url = new URL(value);
    if (url.hostname !== "drive.google.com" || url.username || url.password)
      throw new PolicyError("Einen Google-Drive-Ordnerlink verwenden.");
    value = url.pathname.match(/\/folders\/([A-Za-z0-9_-]+)/)?.[1] || "";
  }
  return driveId.parse(value);
}
export async function chooseDriveFolder(actor: string, raw: unknown) {
  const value = z
    .object({ folder: z.string().trim().max(2000) })
    .strict()
    .parse(raw);
  const id = parseFolder(value.folder);
  const { token, connection } = await access(actor);
  const folder = await driveFetch(token, `files/${id}`, {
    fields: "id,name,mimeType,trashed",
    supportsAllDrives: "true",
  });
  if (folder.trashed || folder.mimeType !== folderMime)
    throw new PolicyError("Kein verfügbarer Drive-Ordner.");
  // Do not recreate or overwrite a connection that was disconnected/replaced in flight.
  const updated = await db.driveConnection.updateMany({
    where: { userId: actor, encryptedToken: connection.encryptedToken },
    data: { folderId: id, folderName: String(folder.name).slice(0, 500) },
  });
  if (!updated.count)
    throw new PolicyError("Verbindung wurde geändert. Neu laden.", 409);
  return driveStatus(actor);
}
const fileSchema = z.object({
  id: driveId,
  name: z.string(),
  mimeType: z.string(),
});
export async function listDriveFiles(actor: string, pageToken?: string) {
  if (pageToken && pageToken.length > 2000)
    throw new PolicyError("Ungültige Seite.");
  const { token, connection } = await access(actor);
  if (!connection.folderId) return { files: [], nextPageToken: null };
  const data = await driveFetch(token, "files", {
    q: `'${driveId.parse(connection.folderId)}' in parents and trashed = false`,
    fields: "nextPageToken,files(id,name,mimeType)",
    pageSize: "50",
    orderBy: "folder,name",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
    ...(pageToken ? { pageToken } : {}),
  });
  return {
    files: z.array(fileSchema).parse(data.files || []),
    nextPageToken:
      typeof data.nextPageToken === "string" ? data.nextPageToken : null,
  };
}
export async function disconnectDrive(actor: string) {
  await authorize(actor);
  await db.$transaction([
    db.driveConnection.deleteMany({ where: { userId: actor } }),
    db.driveOAuthState.deleteMany({ where: { userId: actor } }),
  ]);
  return { ok: true };
}
