import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { PolicyError } from "../policy";
function key() {
  const value = process.env.DRIVE_TOKEN_ENCRYPTION_KEY || "";
  if (!/^[a-f0-9]{64}$/i.test(value))
    throw new PolicyError("Google Drive: Serverkonfiguration fehlt.", 503);
  return Buffer.from(value, "hex");
}
export function seal(value: string, userId: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(userId));
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data]
    .map((b) => b.toString("base64url"))
    .join(".");
}
export function unseal(value: string, userId: string) {
  try {
    const [iv, tag, data] = value
      .split(".")
      .map((v) => Buffer.from(v, "base64url"));
    const cipher = createDecipheriv("aes-256-gcm", key(), iv);
    cipher.setAAD(Buffer.from(userId));
    cipher.setAuthTag(tag);
    return Buffer.concat([cipher.update(data), cipher.final()]).toString(
      "utf8",
    );
  } catch {
    throw new PolicyError(
      "Google Drive: Verbindung bitte neu einrichten.",
      503,
    );
  }
}
