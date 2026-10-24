import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Public application identity, separate from private content assets and
// the original Studiojeker logo used in marketing layouts.
export const runtime = "nodejs";
export const dynamic = "force-static";
export async function GET() {
  const bytes = await readFile(
    join(process.cwd(), "brand/studioone-app-logo.jpg"),
  );
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=3600, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
