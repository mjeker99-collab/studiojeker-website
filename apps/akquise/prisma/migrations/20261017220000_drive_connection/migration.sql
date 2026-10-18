CREATE TABLE "DriveConnection" (
  "userId" TEXT NOT NULL PRIMARY KEY,
  "encryptedToken" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "folderId" TEXT,
  "folderName" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "DriveOAuthState" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "verifier" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL
);
