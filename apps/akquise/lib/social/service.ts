import {
  createHash,
  randomBytes,
  createCipheriv,
  timingSafeEqual,
} from "node:crypto";
import { db } from "../db";
import { PolicyError } from "../policy";
import { appOrigin, allowedAccount } from "../config.mjs";
import { hubActor } from "../hub/workflow";

export type Provider = "meta" | "linkedin";
const graphVersion = "v26.0";
const metaScope =
  "pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish";
const linkedinScope = "openid profile w_organization_social";
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
const idPattern = /^[0-9]{1,30}$/;
function key() {
  const value = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY || "";
  if (!/^[a-f0-9]{64}$/i.test(value))
    throw new PolicyError("Social: Verschlüsselungsschlüssel fehlt.", 503);
  return Buffer.from(value, "hex");
}
function seal(value: string, context: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(context));
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), encrypted]
    .map((b) => b.toString("base64url"))
    .join(".");
}
function credentials(provider: Provider) {
  key();
  const prefix = provider === "meta" ? "META" : "LINKEDIN";
  const id = process.env[`${prefix}_CLIENT_ID`];
  const secret = process.env[`${prefix}_CLIENT_SECRET`];
  if (!id || !secret)
    throw new PolicyError(`${provider}: OAuth-App nicht konfiguriert.`, 503);
  return {
    id,
    secret,
    redirect: `${appOrigin()}/api/social/${provider}/callback`,
  };
}
function configured(provider: Provider) {
  const prefix = provider === "meta" ? "META" : "LINKEDIN";
  return Boolean(
    process.env[`${prefix}_CLIENT_ID`] &&
    process.env[`${prefix}_CLIENT_SECRET`] &&
    /^[a-f0-9]{64}$/i.test(process.env.SOCIAL_TOKEN_ENCRYPTION_KEY || ""),
  );
}
async function jsonResponse(url: string, init?: RequestInit) {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
  } catch {
    throw new PolicyError("Social-Anbieter nicht erreichbar.", 502);
  }
  if (!response.ok)
    throw new PolicyError(
      "Social-Anbieter hat die Anfrage abgelehnt. Berechtigungen prüfen und erneut verbinden.",
      502,
    );
  return response.json();
}
async function auth(actor: string) {
  await db.$transaction((tx) => hubActor(tx, actor));
}
export async function status(actor: string) {
  await auth(actor);
  const connections = await db.socialConnection.findMany({
    select: {
      provider: true,
      accountId: true,
      accountName: true,
      expiresAt: true,
      ownerId: true,
    },
    orderBy: { updatedAt: "desc" },
  });
  return {
    configured: { meta: configured("meta"), linkedin: configured("linkedin") },
    connections: connections.map((c) => ({
      ...c,
      expired: !!c.expiresAt && c.expiresAt <= new Date(),
    })),
  };
}
export async function begin(
  actor: string,
  sessionId: string,
  provider: Provider,
) {
  const { id, redirect } = credentials(provider);
  await auth(actor);
  const state = randomBytes(32).toString("base64url");
  await db.$transaction(async (tx) => {
    await tx.socialOAuthState.deleteMany({
      where: {
        OR: [{ userId: actor, provider }, { expiresAt: { lt: new Date() } }],
      },
    });
    await tx.socialOAuthState.create({
      data: {
        id: digest(state),
        provider,
        userId: actor,
        sessionId,
        expiresAt: new Date(Date.now() + 600000),
      },
    });
  });
  const url = new URL(
    provider === "meta"
      ? `https://www.facebook.com/${graphVersion}/dialog/oauth`
      : "https://www.linkedin.com/oauth/v2/authorization",
  );
  Object.entries({
    client_id: id,
    redirect_uri: redirect,
    response_type: "code",
    scope: provider === "meta" ? metaScope : linkedinScope,
    state,
  }).forEach(([k, v]) => url.searchParams.set(k, v));
  return { url: url.toString(), state };
}
export async function complete(
  provider: Provider,
  state: string,
  cookie: string,
  code: string | null,
  denied: boolean,
) {
  if (
    !state ||
    state.length > 100 ||
    !cookie ||
    state.length !== cookie.length ||
    !timingSafeEqual(Buffer.from(state), Buffer.from(cookie))
  )
    throw new PolicyError("Anmeldung ungültig.", 403);
  const pending = await db.$transaction(async (tx) => {
    const record = await tx.socialOAuthState.findUnique({
      where: { id: digest(state) },
    });
    if (
      !record ||
      record.provider !== provider ||
      record.expiresAt < new Date()
    )
      throw new PolicyError("Anmeldung abgelaufen.", 403);
    const session = await tx.session.findUnique({
      where: { id: record.sessionId },
      include: { user: true },
    });
    if (
      !session ||
      session.userId !== record.userId ||
      session.expiresAt < new Date() ||
      !session.user.active ||
      !allowedAccount(session.user)
    )
      throw new PolicyError("StudioONE-Sitzung abgelaufen.", 403);
    const claim = await tx.socialOAuthState.deleteMany({
      where: { id: record.id, provider },
    });
    if (claim.count !== 1)
      throw new PolicyError("Anmeldung bereits verarbeitet.", 409);
    return record;
  });
  if (denied || !code || code.length > 4096)
    throw new PolicyError("Anmeldung nicht freigegeben.", 403);
  const { id, secret, redirect } = credentials(provider);
  let accessToken: string;
  let expiresAt: Date | null = null;
  if (provider === "meta") {
    const params = new URLSearchParams({
      client_id: id,
      client_secret: secret,
      redirect_uri: redirect,
      code,
    });
    const token = await jsonResponse(
      `https://graph.facebook.com/${graphVersion}/oauth/access_token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      },
    );
    if (typeof token.access_token !== "string")
      throw new PolicyError("Meta-Token fehlt.", 502);
    const long = await jsonResponse(
      `https://graph.facebook.com/${graphVersion}/oauth/access_token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "fb_exchange_token",
          client_id: id,
          client_secret: secret,
          fb_exchange_token: token.access_token,
        }),
      },
    );
    if (typeof long.access_token !== "string")
      throw new PolicyError("Meta-Token fehlt.", 502);
    accessToken = long.access_token;
    expiresAt = new Date(
      Date.now() + Number(long.expires_in || 5184000) * 1000,
    );
  } else {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirect,
      client_id: id,
      client_secret: secret,
    });
    const token = await jsonResponse(
      "https://www.linkedin.com/oauth/v2/accessToken",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      },
    );
    if (
      typeof token.access_token !== "string" ||
      !Number.isFinite(Number(token.expires_in))
    )
      throw new PolicyError("LinkedIn-Token fehlt.", 502);
    accessToken = token.access_token;
    expiresAt = new Date(Date.now() + Number(token.expires_in) * 1000);
  }
  const session = await db.session.findUnique({
    where: { id: pending.sessionId },
  });
  if (
    !session ||
    session.userId !== pending.userId ||
    session.expiresAt < new Date()
  )
    throw new PolicyError("StudioONE-Sitzung abgelaufen.", 403);
  if (provider === "meta") {
    const permissions = await jsonResponse(
      `https://graph.facebook.com/${graphVersion}/me/permissions`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const granted = new Set<string>(
      Array.isArray(permissions.data)
        ? permissions.data
            .filter((p: { status?: string }) => p.status === "granted")
            .map((p: { permission: string }) => p.permission)
        : [],
    );
    if (
      !["pages_show_list", "pages_manage_posts", "pages_read_engagement"].every(
        (scope) => granted.has(scope),
      )
    )
      throw new PolicyError("Facebook-Seitenrechte fehlen.", 403);
    const pages = await jsonResponse(
      `https://graph.facebook.com/${graphVersion}/me/accounts?fields=id,name,access_token,tasks,instagram_business_account{id,username}&limit=100`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!Array.isArray(pages.data))
      throw new PolicyError("Keine Meta-Seiten verfügbar.", 502);
    let matched = 0;
    for (const p of pages.data) {
      if (
        !idPattern.test(p.id) ||
        typeof p.name !== "string" ||
        typeof p.access_token !== "string"
      )
        continue;
      // Only pages with publishing rights are offered as connected channels.
      if (
        !Array.isArray(p.tasks) ||
        !p.tasks.includes("CREATE_CONTENT") ||
        !/studiojeker/i.test(p.name)
      )
        continue;
      matched++;
      await db.socialConnection.upsert({
        where: {
          provider_accountId: { provider: "FACEBOOK", accountId: p.id },
        },
        create: {
          provider: "FACEBOOK",
          accountId: p.id,
          accountName: p.name.slice(0, 200),
          encryptedToken: seal(p.access_token, `FACEBOOK:${p.id}`),
          expiresAt,
          ownerId: pending.userId,
        },
        update: {
          accountName: p.name.slice(0, 200),
          encryptedToken: seal(p.access_token, `FACEBOOK:${p.id}`),
          expiresAt,
          ownerId: pending.userId,
        },
      });
      const ig = p.instagram_business_account;
      if (
        ig &&
        idPattern.test(ig.id) &&
        granted.has("instagram_basic") &&
        granted.has("instagram_content_publish")
      )
        await db.socialConnection.upsert({
          where: {
            provider_accountId: { provider: "INSTAGRAM", accountId: ig.id },
          },
          create: {
            provider: "INSTAGRAM",
            accountId: ig.id,
            accountName: String(ig.username || p.name).slice(0, 200),
            encryptedToken: seal(p.access_token, `INSTAGRAM:${ig.id}`),
            expiresAt,
            ownerId: pending.userId,
          },
          update: {
            accountName: String(ig.username || p.name).slice(0, 200),
            encryptedToken: seal(p.access_token, `INSTAGRAM:${ig.id}`),
            expiresAt,
            ownerId: pending.userId,
          },
        });
    }
    if (!matched)
      throw new PolicyError(
        "Keine Studiojeker-Seite mit Veröffentlichungsrecht gefunden.",
        403,
      );
  } else {
    const profile = await jsonResponse("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (typeof profile.sub !== "string" || !profile.sub)
      throw new PolicyError("LinkedIn-Profil nicht verfügbar.", 502);
    await db.socialConnection.upsert({
      where: {
        provider_accountId: { provider: "LINKEDIN", accountId: profile.sub },
      },
      create: {
        provider: "LINKEDIN",
        accountId: profile.sub,
        accountName: String(profile.name || "LinkedIn-Konto").slice(0, 200),
        encryptedToken: seal(accessToken, `LINKEDIN:${profile.sub}`),
        expiresAt,
        ownerId: pending.userId,
      },
      update: {
        accountName: String(profile.name || "LinkedIn-Konto").slice(0, 200),
        encryptedToken: seal(accessToken, `LINKEDIN:${profile.sub}`),
        expiresAt,
        ownerId: pending.userId,
      },
    });
  }
}
export async function disconnect(
  actor: string,
  provider: string,
  accountId: string,
) {
  await auth(actor);
  if (
    !["FACEBOOK", "INSTAGRAM", "LINKEDIN"].includes(provider) ||
    !accountId ||
    accountId.length > 200
  )
    throw new PolicyError("Ungültiges Social-Konto.");
  const removed = await db.socialConnection.deleteMany({
    where: { provider, accountId, ownerId: actor },
  });
  if (!removed.count)
    throw new PolicyError(
      "Nur die verbindende Person kann dieses Konto trennen.",
      403,
    );
  return { ok: true };
}
