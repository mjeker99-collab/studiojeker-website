import { requireUser } from "@/lib/auth";
import { z } from "zod";
import { checkNewsletterLink, type Result } from "@/lib/hub/newsletter-link-check";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const input = z.object({
  urls: z.array(z.string().max(2000)).min(1).max(20),
}).strict();

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
