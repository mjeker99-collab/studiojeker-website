CREATE TABLE "SocialOAuthState" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "provider" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "SocialConnection" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "provider" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "accountName" TEXT NOT NULL,
  "encryptedToken" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "ownerId" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "SocialConnection_provider_accountId_key" ON "SocialConnection"("provider", "accountId");
CREATE INDEX "SocialConnection_ownerId_provider_idx" ON "SocialConnection"("ownerId", "provider");
