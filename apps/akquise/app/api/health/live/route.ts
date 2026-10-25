import { deployIdentity } from "@/lib/deploy-identity";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json(
    { status: "ok", deploy: deployIdentity() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
