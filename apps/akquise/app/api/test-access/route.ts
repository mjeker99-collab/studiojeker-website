import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { appOrigin, isolatedTestEnvironment } from "@/lib/config.mjs";
import { personKey } from "@/lib/policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const registration = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(14).max(256),
  invitationCode: z.string().min(32).max(256),
}).strict();

const noStore = { "Cache-Control": "no-store, private" };

export async function GET() {
  return NextResponse.json(
    { enabled: isolatedTestEnvironment() },
    { headers: noStore },
  );
}

export async function POST(req: NextRequest) {
  if (!isolatedTestEnvironment())
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404, headers: noStore });
  if (req.headers.get("origin") !== appOrigin())
    return NextResponse.json({ error: "Ungültiger Ursprung." }, { status: 403, headers: noStore });
  if (Number(req.headers.get("content-length") || 0) > 4096)
    return NextResponse.json({ error: "Anfrage zu gross." }, { status: 413, headers: noStore });
  try {
    const body = await req.text();
    if (Buffer.byteLength(body) > 4096)
      return NextResponse.json({ error: "Anfrage zu gross." }, { status: 413, headers: noStore });
    const input = registration.parse(JSON.parse(body));
    if (/(^|[.@])(example|test|invalid|localhost)([.@]|$)/i.test(input.email))
      return NextResponse.json({ error: "Bitte eine echte persönliche E-Mail-Adresse verwenden." }, { status: 400, headers: noStore });
    const expected = createHash("sha256").update(process.env.TEST_ACCESS_CODE || "").digest();
    const supplied = createHash("sha256").update(input.invitationCode).digest();
    if (!timingSafeEqual(expected, supplied))
      return NextResponse.json({ error: "Einladungscode nicht gültig." }, { status: 403, headers: noStore });

    // Sandbox-wide cap, no self-service registration in the productive system.
    if (await db.user.count() >= 20)
      return NextResponse.json({ error: "Alle Testplätze sind vergeben." }, { status: 403, headers: noStore });
    if (await db.user.findUnique({ where: { email: input.email }, select: { id: true } }))
      return NextResponse.json({ error: "Diese Adresse ist bereits registriert." }, { status: 409, headers: noStore });

    await db.studioOrganization.upsert({
      where: { id: "studiojeker" },
      create: { id: "studiojeker", name: "StudioONE Testumgebung", brand: {} },
      update: {},
    });
    const user = await db.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: hashPassword(input.password),
      },
      select: { id: true },
    });
    const rows = [
      ["Beispiel Architektur AG", "Anna", "Muster", "Architektur", "Solothurn"],
      ["Demo Immobilien GmbH", "Luca", "Beispiel", "Immobilien", "Bern"],
      ["Muster Maschinen AG", "Eva", "Test", "Industrie", "Olten"],
      ["Beispiel Dienstleistung GmbH", "Mia", "Demo", "Dienstleistung", "Biel"],
      ["Muster Stiftung", "Noah", "Beispiel", "Stiftung", "Grenchen"],
    ] as const;
    await db.contact.createMany({
      data: rows.map(([organisation, firstName, lastName, industry, region]) => ({
        organisation, firstName, lastName, industry, region,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.test`,
        personKey: personKey(firstName, lastName, organisation),
        notes: "SYNTHETISCHE TESTDATEN – keine reale Organisation.",
        confidence: "UNCONFIRMED",
      })),
      skipDuplicates: true,
    });
    await db.audit.create({
      data: { userId: user.id, action: "TEST_REGISTRATION", entityId: user.id, detail: {} },
    });
    return NextResponse.json({ ok: true }, { status: 201, headers: noStore });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: "Bitte alle Felder korrekt ausfüllen; Passwort mindestens 14 Zeichen." }, { status: 400, headers: noStore });
    if (error instanceof SyntaxError)
      return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400, headers: noStore });
    console.error("Test registration failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ error: "Testzugang konnte nicht erstellt werden." }, { status: 500, headers: noStore });
  }
}
