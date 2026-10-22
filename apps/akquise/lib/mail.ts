import nodemailer from "nodemailer";
import { assertExternalSendingAllowed } from "./policy";
// No SMTP transport can be constructed in V1, even when ENABLE_EMAIL_SENDING=true.
export function createMetanetTransport(): never {
  assertExternalSendingAllowed();
}
export const metanetConfiguration = () => ({
  host: process.env.SMTP_HOST ?? "jovinus.metanet.ch",
  port: process.env.SMTP_PORT ?? "",
  secure: process.env.SMTP_SECURE ?? "",
  user: process.env.SMTP_USER ?? "njeker@studiojeker.ch",
  enabled: false,
});
export async function renderLocalMessage(message: {
  recipient: string;
  subject: string;
  body: string;
  messageId: string;
}) {
  const transport = nodemailer.createTransport({
    streamTransport: true,
    buffer: true,
    newline: "unix",
  });
  const result = await transport.sendMail({
    from: "Nora Jeker <njeker@studiojeker.ch>",
    to: message.recipient,
    subject: message.subject,
    text: message.body,
    messageId: message.messageId,
  });
  if (!Buffer.isBuffer(result.message))
    throw new Error("Lokaler MIME-Transport lieferte keinen Buffer.");
  return result.message.toString("utf8");
}
