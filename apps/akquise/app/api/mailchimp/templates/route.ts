import { requireUser } from "@/lib/auth";
import { mailchimpConfiguration, mailchimpEndpoint } from "@/lib/hub/mailchimp";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireUser();
    const cfg = mailchimpConfiguration();
    if (!cfg.ok) {
      return Response.json({ connected: false, templates: [] }, { headers: { "Cache-Control": "no-store" } });
    }
    const response = await fetch(
      mailchimpEndpoint(cfg.serverPrefix, "/templates?count=100&fields=templates.id,templates.name,templates.type,templates.active,total_items"),
      {
        headers: { Authorization: cfg.authorization },
        signal: AbortSignal.timeout(15000),
        cache: "no-store",
      },
    );
    if (!response.ok) {
      return Response.json(
        { error: response.status === 401 || response.status === 403 ? "Mailchimp-Zugang prüfen." : "Mailchimp-Vorlagen konnten nicht geladen werden." },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }
    const payload = (await response.json()) as {
      templates?: { id: number; name: string; type?: string; active?: boolean }[];
    };
    return Response.json(
      { connected: true, templates: (payload.templates || []).filter((item) => item.active !== false).map(({ id, name, type }) => ({ id, name, type })) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ error: "Nicht angemeldet oder Mailchimp nicht erreichbar." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
}
