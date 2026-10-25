import { requireGptWrite } from "@/lib/gpt-connector/auth";
import { gptError, gptJson } from "@/lib/gpt-connector/http";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    await requireGptWrite(req);
    return gptJson({ enabled: true, mode: "editorial_drafts_only" });
  } catch (error) {
    return gptError(error);
  }
}
