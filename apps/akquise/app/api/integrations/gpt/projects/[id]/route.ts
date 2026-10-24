import { requireGptConnector } from "@/lib/gpt-connector/auth";
import { getSharedProject } from "@/lib/gpt-connector/service";
import { gptError, gptJson } from "@/lib/gpt-connector/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireGptConnector(req, "projects");
    const { id } = await ctx.params;
    return gptJson(await getSharedProject(id));
  } catch (error) {
    return gptError(error);
  }
}
