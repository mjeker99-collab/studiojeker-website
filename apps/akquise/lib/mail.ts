import nodemailer from "nodemailer";
import { assertExternalSendingAllowed } from "./policy";
import { readMailConfig } from "./config.mjs";
import { signedMessage } from "./mail-signature";
import { signatureAttachments } from "./mail-signature-assets";
export function createMetanetTransport() {
  assertExternalSendingAllowed();
  const config = readMailConfig();
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: config.port,
    secure: config.secure,
    requireTLS: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 12000,
    disableFileAccess: true,
    disableUrlAccess: true,
    pool: false,
  });
}
export type OutboundMessage = {
  recipient: string;
  subject: string;
  body: string;
  messageId: string;
  envelopeRecipients: string[];
  test: boolean;
};
export type SmtpSender = (
  message: OutboundMessage,
) => Promise<{ accepted: string[]; rejected: string[] }>;
export const smtpSender: SmtpSender = async (message) => {
  const transport = createMetanetTransport();
  try {
    const result = await transport.sendMail({
      from: "Nora Jeker <njeker@studiojeker.ch>",
      to: message.envelopeRecipients,
      subject: message.test
        ? `[INTERNER TEST] ${message.subject}`
        : message.subject,
      ...signedMessage(message.body),
      attachments: await signatureAttachments(),
      messageId: message.messageId,
      envelope: {
        from: "njeker@studiojeker.ch",
        to: message.envelopeRecipients,
      },
    });
    return {
      accepted: result.accepted.map(String),
      rejected: result.rejected.map(String),
    };
  } finally {
    transport.close();
  }
};
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
    ...signedMessage(message.body),
    attachments: await signatureAttachments(),
    messageId: message.messageId,
  });
  if (!Buffer.isBuffer(result.message))
    throw new Error("Lokaler MIME-Transport lieferte keinen Buffer.");
  return result.message.toString("utf8");
}
