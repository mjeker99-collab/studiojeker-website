import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    await requireUser();
    if (request.headers.get("x-rights-confirmed") !== "true") {
      return Response.json({ error: "Nutzungsrechte müssen bestätigt werden." }, { status: 400 });
    }
    const key = process.env.MAILCHIMP_API_KEY?.trim();
    const dc = key?.match(/-([a-z]{2,4}\d{1,3})$/i)?.[1];
    if (!key || !dc) return Response.json({ error: "Mailchimp ist nicht verbunden." }, { status: 503 });
    const len = Number(request.headers.get("content-length") || "0");
    if (len > MAX_BYTES) return Response.json({ error: "Maximal 8 MB pro Bild." }, { status: 413 });
    const bytes = Buffer.from(await request.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_BYTES) return Response.json({ error: "Ungültige Bildgrösse." }, { status: 413 });
    const isJpeg = bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isPng = bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const isWebp = bytes.length > 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
    if (!isJpeg && !isPng && !isWebp)
      return Response.json({ error: "Nur JPEG, PNG und WebP sind erlaubt." }, { status: 415 });
    const ext = isJpeg ? "jpg" : isPng ? "png" : "webp";
    const raw = request.headers.get("x-file-name") || "newsletter";
    let requestedName = "newsletter";
    try { requestedName = decodeURIComponent(raw); } catch { /* fallback */ }
    const clean = requestedName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/\.(jpe?g|png|webp)$/i, "").slice(0, 90) || "newsletter";
    const filename = `${clean}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const response = await fetch(`https://${dc.toLowerCase()}.api.mailchimp.com/3.0/file-manager/files`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`studioone:${key}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: filename, file_data: bytes.toString("base64") }),
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok)
      return Response.json({ error: response.status === 401 || response.status === 403 ? "Mailchimp-Zugang prüfen." : `Mailchimp-Bildupload fehlgeschlagen (HTTP ${response.status}).` }, { status: 502 });
    const result = (await response.json()) as { full_size_url?: string; url?: string };
    const url = result.full_size_url || result.url;
    if (!url || !url.startsWith("https://"))
      return Response.json({ error: "Mailchimp hat keine nutzbare Bildadresse zurückgegeben." }, { status: 502 });
    return Response.json({ url }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Upload nicht möglich. Bitte erneut anmelden oder Verbindung prüfen." }, { status: 500 });
  }
}
