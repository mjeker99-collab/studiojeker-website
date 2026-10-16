import { db } from "../lib/db";
try {
  const counts = {
    contacts: await db.contact.count(),
    drafts: await db.draft.count(),
    versions: await db.draftVersion.count(),
    approvals: await db.approval.count(),
    legalReviews: await db.legalReview.count(),
    deliveries: await db.delivery.count(),
    suppressions: await db.suppression.count(),
    audits: await db.audit.count(),
    sessions: await db.session.count(),
    syntheticContacts: await db.contact.count({
      where: {
        OR: [
          { email: { endsWith: ".test" } },
          { email: { endsWith: ".invalid" } },
        ],
      },
    }),
    syntheticUsers: await db.user.count({
      where: { email: { endsWith: ".test" } },
    }),
  };
  console.log(JSON.stringify(counts, null, 2));
} finally {
  await db.$disconnect();
}
