import { db } from "./db";
// Header-only correlation contract; no IMAP connection or automatic analysis in V1.
export async function matchReply(headers: {
  messageId: string;
  inReplyTo?: string;
  references: string[];
}) {
  const candidates = [headers.inReplyTo, ...headers.references].filter(
    (v): v is string => Boolean(v),
  );
  const delivery = await db.delivery.findFirst({
    where: {
      messageId: { in: candidates },
      status: { in: ["SENT", "REPLIED"] },
    },
  });
  return delivery
    ? { deliveryId: delivery.id, draftId: delivery.draftId }
    : null;
}
