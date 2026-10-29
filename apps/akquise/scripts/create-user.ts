import { db } from "../lib/db";
import { hashPassword } from "../lib/auth";
// Read initial password from stdin; never from a command argument or committed file.
const [name, email] = process.argv.slice(2);
if (
  !["Martin Jeker", "Nora Jeker"].includes(name) ||
  !email ||
  !/^\S+@\S+\.\S+$/.test(email)
)
  throw new Error(
    'Aufruf: npm run user:create -- "Martin Jeker" individuelle@adresse.ch < passwortdatei',
  );
let password = "";
for await (const chunk of process.stdin) password += chunk;
try {
  await db.user.create({
    data: {
      name,
      email: email.trim().toLowerCase(),
      passwordHash: hashPassword(password.trimEnd()),
    },
  });
  console.log("Individuelles Konto erstellt.");
} finally {
  await db.$disconnect();
}
