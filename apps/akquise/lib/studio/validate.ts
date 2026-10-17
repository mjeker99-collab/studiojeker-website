import type { Tx } from "../workflow";
import { PolicyError } from "../policy";
import { logoHash } from "./config";
import { ORG, type StudioSnapshot } from "./input";
export async function validateStudio(tx: Tx, s: StudioSnapshot) {
  if (
    !(await tx.studioSeries.findFirst({
      where: { id: s.seriesId, organizationId: ORG },
    }))
  )
    throw new PolicyError("Serie nicht zugänglich.", 403);
  if (s.logoSha256 !== logoHash())
    throw new PolicyError("Original-Logo stimmt nicht überein.", 409);
  for (const [id, hash, font] of [
    [s.motifAssetId, s.motifSha256, false],
    [s.fontAssetId, s.fontSha256, true],
  ] as const) {
    if (!id) {
      if (hash) throw new PolicyError("Asset-Prüfsumme ohne Datei.");
      continue;
    }
    const a = await tx.studioAsset.findFirst({
      where: { id, organizationId: ORG, deletedAt: null },
    });
    if (
      !a ||
      a.sha256 !== hash ||
      (font ? a.kind !== "FONT" : !a.mime.startsWith("image/"))
    )
      throw new PolicyError("Datei oder Version nicht zugänglich.", 403);
  }
}
