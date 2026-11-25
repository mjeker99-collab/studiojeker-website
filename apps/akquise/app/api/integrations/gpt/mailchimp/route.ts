import { handleMailchimpRead } from "@/lib/gpt-connector/mailchimp-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return handleMailchimpRead(req);
}
