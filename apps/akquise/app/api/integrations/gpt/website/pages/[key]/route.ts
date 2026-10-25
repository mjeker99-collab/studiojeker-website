import { requireGptConnector } from "@/lib/gpt-connector/auth";
import { gptError, gptJson } from "@/lib/gpt-connector/http";
import { siteCmsPage } from "@/lib/site-cms/service";
import { PolicyError } from "@/lib/policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  try {
    const { actorId } = await requireGptConnector(req, "content");
    if (!actorId) throw new PolicyError("Kein aktiver StudioONE-Akteur konfiguriert.", 503);
    const { key } = await params;
    return gptJson(await siteCmsPage(actorId, key));
  } catch (error) {
    return gptError(error);
  }
}
