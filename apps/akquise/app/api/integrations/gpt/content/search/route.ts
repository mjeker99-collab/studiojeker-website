import { requireGptConnector } from "@/lib/gpt-connector/auth";
import { searchSharedContent } from "@/lib/gpt-connector/service";
import { gptError, gptJson } from "@/lib/gpt-connector/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireGptConnector(req, "content");
    const q = new URL(req.url).searchParams.get("q") ?? "";
    return gptJson(await searchSharedContent(q));
  } catch (error) {
    return gptError(error);
  }
}
