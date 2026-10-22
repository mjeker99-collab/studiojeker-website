import { publicWebsite } from "@/lib/websites/publication";
import { previewCsp } from "@/lib/websites/render";
import { PolicyError } from "@/lib/policy";
export const dynamic = "force-dynamic";
export async function GET(
  _req: Request,
  context: { params: Promise<{ slug: string; path: string[] }> },
) {
  const headers = {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy":
      previewCsp +
      "; frame-ancestors 'none'; sandbox allow-same-origin allow-top-navigation-by-user-activation",
  };
  try {
    const { slug, path } = await context.params;
    const result = await publicWebsite(slug, path);
    return new Response(result.body, {
      headers: { ...headers, "Content-Type": result.mime },
    });
  } catch (e) {
    return new Response("Seite nicht verfügbar.", {
      status: e instanceof PolicyError ? e.status : 503,
      headers,
    });
  }
}
