import { requireUser } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const input = z.object({
  urls: z.array(z.string().max(2000)).min(1).max(20),
}).strict();

type Result = { url: string; status: "reachable" | "broken" | "review"; detail: string };

// No generic URL fetching: a check button must not be an SSRF proxy.
export function approvedLinkUrl(raw: string): URL | null {
  try {
    const value = new URL(raw);
    if (value.protocol !== "https:" || value.username || value.password ||
        value.port || value.hostname.endsWith(".") || value.hostname.includes("%"))
      return null;
    const host = value.hostname.toLowerCase();
    const allowed =
      ["studiojeker.ch", "www.studiojeker.ch", "vimeo.com", "www.vimeo.com",
        "raw.githubusercontent.com", "mcusercontent.com"].includes(host) ||
      /^[a-z0-9-]+\.mcusercontent\.com$/.test(host);
    if (!allowed) return null;
    value.hash = "";
    return value;
  } catch { return null; }
}

export async function checkNewsletterLink(raw: string, fetcher: typeof fetch = fetch): Promise<Result> {
  const url = approvedLinkUrl(raw);
  if (!url) return { url: raw, status: "review", detail: "Nur manuell prüfen" };
  try {
    const response = await fetcher(url.toString(), {
      method: "HEAD",
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (response.status >= 200 && response.status < 300)
      return { url: raw, status: "reachable", detail: "Server erreichbar" };
    if ([404, 410].includes(response.status))
      return { url: raw, status: "broken", detail: "Link nicht gefunden" };
    // Some sites reject HEAD or redirect to consent/tracking pages.
    return { url: raw, status: "review", detail: "Bitte im Browser öffnen" };
  } catch {
    return { url: raw, status: "review", detail: "Automatisch nicht prüfbar" };
  }
}

export async function POST(request: Request) {
  try { await requireUser(); }
  catch { return Response.json({ error: "Bitte anmelden." }, { status: 401 }); }
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json({ error: "Ungültiger Ursprung." }, { status: 403 });
  if (Number(request.headers.get("content-length") || 0) > 8000)
    return Response.json({ error: "Zu viele Links." }, { status: 413 });
  const body = await request.text();
  if (Buffer.byteLength(body) > 8000)
    return Response.json({ error: "Zu viele Links." }, { status: 413 });
  const parsed = input.safeParse((() => { try { return JSON.parse(body); } catch { return null; } })());
  if (!parsed.success)
    return Response.json({ error: "Ungültige Linkliste." }, { status: 400 });
  const urls = [...new Set(parsed.data.urls)];
  const results: Result[] = [];
  // Small bounded batches; never download pages or forward cookies/tokens.
  for (let i = 0; i < urls.length; i += 4)
    results.push(...await Promise.all(urls.slice(i, i + 4).map(url => checkNewsletterLink(url))));
  return Response.json({ results }, { headers: { "Cache-Control": "no-store" } });
}
