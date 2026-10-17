import { z } from "zod";
const t = (n: number) => z.string().trim().max(n);
// References are never fetched server-side. No embeds or implicit provider access.
export const referenceUrl = t(2000).refine((v) => {
  if (!v) return true;
  try {
    const u = new URL(v);
    return u.protocol === "https:" && !u.username && !u.password;
  } catch {
    return false;
  }
}, "Eine HTTPS-URL ohne Zugangsdaten verwenden.");
export const itemInput = z
  .object({
    id: t(200).optional(),
    revision: z.number().int().positive().optional(),
    kind: z.enum([
      "TEXT",
      "LINK",
      "VIDEO",
      "IMAGE",
      "DOCUMENT",
      "EXPORT",
      "FONT",
    ]),
    title: t(200).min(1),
    description: t(4000),
    source: t(2000),
    rights: t(2000),
    tags: z.array(t(60).min(1)).max(20),
    campaignId: t(200).nullable(),
    text: t(16000),
    url: referenceUrl,
    thumbnailAssetId: t(200).nullable(),
  })
  .strict();
export const brandInput = z
  .object({
    revision: z.number().int().positive(),
    claim: t(200),
    tone: t(2000),
    address: z.enum(["OFFEN", "DU", "SIE"]),
    swiss: z.literal(true),
    services: t(4000),
    audiences: t(4000),
    examples: t(6000),
    colors: z
      .object({
        black: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        white: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        cyan: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      })
      .strict(),
    logoAssetId: t(200).nullable(),
    logoVariants: z.array(t(200)).max(8),
    fontAssetId: t(200).nullable(),
    fontLicense: t(2000),
  })
  .strict();
export type BrandProfile = Omit<z.infer<typeof brandInput>, "revision">;
export function brandDefaults(raw: unknown): BrandProfile {
  const b = (raw || {}) as Partial<BrandProfile>;
  return {
    claim: b.claim ?? "",
    tone: b.tone ?? "",
    address: b.address ?? "OFFEN",
    swiss: true,
    services: b.services ?? "",
    audiences: b.audiences ?? "",
    examples: b.examples ?? "",
    colors: b.colors ?? { black: "#000000", white: "#ffffff", cyan: "#00c8ff" },
    logoAssetId: b.logoAssetId ?? null,
    logoVariants: b.logoVariants ?? [],
    fontAssetId: b.fontAssetId ?? null,
    fontLicense: b.fontLicense ?? "",
  };
}
