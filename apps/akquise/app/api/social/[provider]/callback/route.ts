import { NextRequest, NextResponse } from "next/server";
import { complete, type Provider } from "@/lib/social/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  if (provider !== "meta" && provider !== "linkedin")
    return new NextResponse(null, { status: 404 });
  let success = false;
  try {
    await complete(
      provider as Provider,
      req.nextUrl.searchParams.get("state") || "",
      req.cookies.get(`studio-social-${provider}`)?.value || "",
      req.nextUrl.searchParams.get("code"),
      req.nextUrl.searchParams.has("error"),
    );
    success = true;
  } catch {
    /* No provider responses, codes or tokens in the browser. */
  }
  const result = new NextResponse(
    `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Social-Konto – StudioONE</title><body><main><h1>${success ? "Anmeldung abgeschlossen" : "Verbindung fehlgeschlagen"}</h1><p>${success ? "Prüfe unter Einstellungen die verbundenen Konten und die erteilten Rechte." : "Kehre zu StudioONE zurück und starte die Anmeldung erneut. Prüfe bei wiederholtem Fehler die App-Konfiguration und Anbieterrechte."}</p><a href="/">Zurück zu StudioONE</a></main></body></html>`,
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
  result.cookies.set(`studio-social-${provider}`, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/api/social/${provider}`,
    maxAge: 0,
  });
  return result;
}
