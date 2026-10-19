import { randomBytes } from "node:crypto";
import { appendFileSync, mkdirSync, chmodSync } from "node:fs";
import { db } from "../lib/db";
import { hashPassword } from "../lib/auth";
import { personKey } from "../lib/policy";
if (
  process.env.NODE_ENV === "production" ||
  process.env.ALLOW_SYNTHETIC_SEED !== "true"
)
  throw new Error("Nur explizit lokal mit ALLOW_SYNTHETIC_SEED=true.");
try {
  for (const name of ["Martin Jeker", "Nora Jeker"]) {
    const email = name.startsWith("Martin")
      ? "martin@example.test"
      : "nora@example.test";
    if (!(await db.user.findUnique({ where: { email } }))) {
      const password = randomBytes(20).toString("base64url");
      await db.user.create({
        data: { name, email, passwordHash: hashPassword(password) },
      });
      const access = `Lokales synthetisches Konto: ${email}\nEinmaliges Passwort: ${password}\n`;
      mkdirSync(".local", { recursive: true });
      appendFileSync(".local/demo-access.txt", access, { mode: 0o600 });
      chmodSync(".local/demo-access.txt", 0o600);
      console.log(access);
    }
  }
  for (const [org, first, last, industry, region, confidence] of [
    [
      "Beispiel Architektur AG",
      "Anna",
      "Muster",
      "Architektur",
      "Solothurn",
      "VERIFIED",
    ],
    [
      "Demo Immobilien GmbH",
      "Luca",
      "Beispiel",
      "Immobilien",
      "Bern",
      "VERIFIED",
    ],
    ["Muster Maschinen AG", "Eva", "Test", "Industrie", "Olten", "UNCONFIRMED"],
    ["Beispiel Stiftung", "Noah", "Muster", "Stiftung", "Basel", "UNCONFIRMED"],
    [
      "Test Genossenschaft",
      "Mia",
      "Demo",
      "Genossenschaft",
      "Zürich",
      "UNCONFIRMED",
    ],
  ]) {
    const email = `${first.toLowerCase()}.${last.toLowerCase()}@${org.split(" ")[1].toLowerCase()}.example.test`;
    await db.contact.upsert({
      where: { personKey: personKey(first, last, org) },
      update: {},
      create: {
        organisation: org,
        firstName: first,
        lastName: last,
        industry,
        region,
        email,
        confidence,
        personKey: personKey(first, last, org),
        verifiedAt: confidence === "VERIFIED" ? new Date() : null,
        sourceUrl: "https://example.test/recherche",
        hook: "In unserer synthetischen Testrecherche ist Ihr dokumentierter Bedarf an neuen Projektbildern vermerkt.",
        service:
          industry === "Industrie"
            ? "Unternehmensfilme"
            : "Architekturvisualisierungen und Immobilienfotografie",
        status: confidence === "VERIFIED" ? "VERIFIED" : "NEW",
        notes:
          "SYNTHETISCHER TESTKONTAKT – keine reale Organisation oder Recherche.",
      },
    });
  }
  console.log("Ausschliesslich synthetische Testkontakte angelegt.");
} finally {
  await db.$disconnect();
}
