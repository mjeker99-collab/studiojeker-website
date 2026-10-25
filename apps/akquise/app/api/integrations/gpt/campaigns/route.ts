import { requireGptConnector } from "@/lib/gpt-connector/auth";
import { listSharedCampaigns } from "@/lib/gpt-connector/service";
import { gptError, gptJson } from "@/lib/gpt-connector/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireGptConnector(req, "campaigns");
    return gptJson(await listSharedCampaigns());
  } catch (error) {
    return gptError(error);
  }
}
