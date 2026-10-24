import { signatureAttachments } from "@/lib/mail-signature-assets";
import { signatureAssets } from "@/lib/mail-signature";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  context: { params: Promise<{ asset: string }> },
) {
  const { asset } = await context.params;
  if (!signatureAssets.some((item) => item.file === asset))
    return new Response(null, { status: 404 });
  const image = (await signatureAttachments()).find(
    (item) => item.filename === asset,
  )!;
  return new Response(new Uint8Array(image.content), {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "public, max-age=3600, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
