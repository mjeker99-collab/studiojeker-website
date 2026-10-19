-- People, not mailboxes, are contact identities. Preserve all existing rows.
DROP INDEX "Contact_email_key";
ALTER TABLE "Contact" ALTER COLUMN "email" SET DEFAULT '';
CREATE INDEX "Contact_email_idx" ON "Contact"("email");
