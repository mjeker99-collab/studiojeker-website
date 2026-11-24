import { handleMailchimpMcp } from "@/lib/gpt-connector/mcp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return handleMailchimpMcp(req);
}

export function POST(req: Request) {
  return handleMailchimpMcp(req);
}
