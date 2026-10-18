import { NextRequest, NextResponse } from "next/server";
import { completeDrive } from "@/lib/drive/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  let success = false;
  try {
    await completeDrive(
      req.nextUrl.searchParams.get("state") || "",
      req.cookies.get("studio-drive-state")?.value || "",
      req.nextUrl.searchParams.get("code"),
      req.nextUrl.searchParams.has("error"),
    );
    success = true;
  } catch {
    /* Never reflect provider codes, token responses or callback parameters. */
  }
  const result = new NextResponse(
    `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Google Drive – StudioONE</title><body><main><h1>${success ? "Google Drive verbunden" : "Google Drive konnte nicht verbunden werden"}</h1><p>${success ? "Öffne die Bibliothek in StudioONE und wähle deinen Drive-Ordner." : "Kehre zur Bibliothek zurück und starte die Anmeldung erneut. Prüfe bei wiederholtem Fehler die Google-Konfiguration und Freigaben."}</p><a href="/">Zurück zu StudioONE</a></main></body></html>`,
    {
      status: success ? 200 : 400,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "Content-Security-Policy":
          "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
  result.cookies.set("studio-drive-state", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/drive",
    maxAge: 0,
  });
  return result;
}
