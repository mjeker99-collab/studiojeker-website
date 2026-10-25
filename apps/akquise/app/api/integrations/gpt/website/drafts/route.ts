import { requireGptWrite } from "@/lib/gpt-connector/auth";
import { gptError, gptJson } from "@/lib/gpt-connector/http";
import { siteCmsSaveDraft } from "@/lib/site-cms/service";
import { PolicyError } from "@/lib/policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Sanity draft write only. Publish is deliberately not exposed to ChatGPT. */
export async function POST(req: Request) {
  try {
    const { actorId } = await requireGptWrite(req);
    const raw = await req.text();
    if (Buffer.byteLength(raw) > 64_000)
      throw new PolicyError("Anfrage zu gross.", 413);
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return gptJson({ error: "Ungültiges JSON." }, 400);
    }
    return gptJson(await siteCmsSaveDraft(actorId, body));
  } catch (error) {
    return gptError(error);
  }
}
