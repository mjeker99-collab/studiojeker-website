import { requireGptConnector } from "@/lib/gpt-connector/auth";
import { gptError, gptJson } from "@/lib/gpt-connector/http";
import { siteCmsOverview } from "@/lib/site-cms/service";
import { PolicyError } from "@/lib/policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { actorId } = await requireGptConnector(req, "content");
    if (!actorId) throw new PolicyError("Kein aktiver StudioONE-Akteur konfiguriert.", 503);
    return gptJson(await siteCmsOverview(actorId));
  } catch (error) {
    return gptError(error);
  }
}
