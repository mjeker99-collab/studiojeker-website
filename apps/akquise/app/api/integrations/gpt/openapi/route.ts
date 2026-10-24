import { gptConnectorOpenApi } from "@/lib/gpt-connector/openapi";
import { gptJson } from "@/lib/gpt-connector/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public schema only — no data. Used to configure ChatGPT Custom Actions. */
export async function GET() {
  return gptJson(gptConnectorOpenApi());
}
