import { db } from "../lib/db";
import { hashPassword } from "../lib/auth";
import { allowedAccount } from "../lib/config.mjs";
const email = process.argv[2]?.trim().toLowerCase();
let password = "";
for await (const chunk of process.stdin) password += chunk;
try {
  const user = await db.user.findUniqueOrThrow({ where: { email } });
  if (!allowedAccount(user))
    throw new Error("Konto ist nicht für Produktion zugelassen.");
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(password.trimEnd()) },
    });
    await tx.session.deleteMany({ where: { userId: user.id } });
    await tx.audit.create({
      data: {
        userId: user.id,
        action: "ADMIN_PASSWORD_RESET",
        entityId: user.id,
        detail: { sessionsRevoked: true },
      },
    });
  });
  console.log("Passwort geändert; alle Sitzungen widerrufen.");
} finally {
  await db.$disconnect();
}
