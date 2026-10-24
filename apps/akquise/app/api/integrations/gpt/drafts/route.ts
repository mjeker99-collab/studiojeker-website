import { requireGptWrite } from "@/lib/gpt-connector/auth";
import { assertDraftBodySize, createDraft } from "@/lib/gpt-connector/drafts";
import { gptError, gptJson } from "@/lib/gpt-connector/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { actorId } = await requireGptWrite(req);
    const rawText = await req.text();
    assertDraftBodySize(req, rawText);
    let body: unknown;
    try {
      body = rawText ? JSON.parse(rawText) : {};
    } catch {
      return gptJson({ error: "Ungültige Anfrage." }, 400);
    }
    const draft = await createDraft(actorId, body);
    return gptJson(draft, draft.idempotentReplay ? 200 : 201);
  } catch (error) {
    return gptError(error);
  }
}
