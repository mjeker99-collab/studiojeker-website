import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";
import { allowedAccount, sessionCookieName } from "./config.mjs";
import { PolicyError } from "./policy";
export function hashPassword(password: string) {
  if (password.length < 14)
    throw new PolicyError("Passwort: mindestens 14 Zeichen.");
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function checkPassword(password: string, hash: string) {
  const [salt, key] = hash.split(":");
  if (!salt || !key) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(key, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function requireUser() {
  const token = (await cookies()).get(sessionCookieName())?.value;
  if (!token) throw new PolicyError("Bitte anmelden.", 401);
  const session = await db.session.findUnique({
    where: { id: tokenHash(token) },
    include: { user: true },
  });
  if (
    !session ||
    session.expiresAt < new Date() ||
    !session.user.active ||
    !allowedAccount(session.user)
  )
    throw new PolicyError("Sitzung abgelaufen.", 401);
  return session.user;
}
export async function login(email: string, password: string) {
  const key = tokenHash(email.trim().toLowerCase());
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
    const attempt = await tx.loginAttempt.findUnique({ where: { key } });
    if (attempt?.lockedUntil && attempt.lockedUntil > new Date())
      return { error: "Zu viele Versuche. In 15 Minuten erneut versuchen." };
    const user = await tx.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    const valid = checkPassword(
      password,
      user?.passwordHash ?? `${"0".repeat(32)}:${"0".repeat(128)}`,
    );
    if (!user?.active || !valid || !allowedAccount(user)) {
      const failures =
        (attempt?.lockedUntil && attempt.lockedUntil < new Date()
          ? 0
          : (attempt?.failures ?? 0)) + 1;
      await tx.loginAttempt.upsert({
        where: { key },
        create: {
          key,
          failures,
          lockedUntil: failures >= 5 ? new Date(Date.now() + 900000) : null,
        },
        update: {
          failures,
          lockedUntil: failures >= 5 ? new Date(Date.now() + 900000) : null,
        },
      });
      return { error: "Anmeldung nicht möglich." };
    }
    await tx.loginAttempt.deleteMany({ where: { key } });
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 8 * 3600000);
    await tx.session.create({
      data: { id: tokenHash(token), userId: user.id, expiresAt },
    });
    await tx.audit.create({
      data: { userId: user.id, action: "LOGIN", entityId: user.id, detail: {} },
    });
    return { token, expiresAt };
  });
}
