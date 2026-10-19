import { z } from "zod";

const percent = z.number().min(0).max(100);
export const graphicsSchema = z
  .object({
    version: z.literal(1),
    panelTop: z.number().min(30).max(80),
    headlineX: percent,
    headlineY: percent,
    headlineWidth: z.number().min(10).max(100),
    headlineHeight: z.number().min(5).max(60),
    fontSize: z.number().int().min(24).max(96),
    align: z.enum(["left", "center", "right"]),
    logoX: percent,
    logoY: percent,
    logoWidth: z.number().min(5).max(40),
    logoHeight: z.number().min(3).max(30),
    logoAssetId: z.string().min(1).nullable(),
    logoSha256: z.string().max(64),
  })
  .strict()
  .superRefine((v, ctx) => {
    for (const key of ["headline", "logo"] as const) {
      if (
        v[`${key}X`] + v[`${key}Width`] > 100 ||
        v[`${key}Y`] + v[`${key}Height`] > 100
      )
        ctx.addIssue({
          code: "custom",
          message: "Ebenen müssen innerhalb der Grafik liegen.",
          path: [`${key}X`],
        });
    }
    if (
      (v.logoAssetId && !/^[a-f0-9]{64}$/.test(v.logoSha256)) ||
      (!v.logoAssetId && v.logoSha256)
    )
      ctx.addIssue({
        code: "custom",
        message: "Logo und Prüfsumme müssen zusammengehören.",
        path: ["logoAssetId"],
      });
  });
export type Graphics = z.infer<typeof graphicsSchema>;
export const graphicsPresets = [
  {
    id: "editorial",
    name: "Editorial",
    description: "Grosses Bild, kompakte Textfläche",
    template: "PANEL",
    panelTop: 65,
    headlineY: 68,
    headlineHeight: 17,
    align: "left",
  },
  {
    id: "statement",
    name: "Statement",
    description: "Mehr Raum für eine starke Aussage",
    template: "PANEL",
    panelTop: 45,
    headlineY: 49,
    headlineHeight: 34,
    align: "left",
  },
  {
    id: "poster",
    name: "Fotoposter",
    description: "Ganzseitiges Foto mit transparenter Textfläche",
    template: "PHOTO",
    panelTop: 55,
    headlineY: 59,
    headlineHeight: 24,
    align: "center",
  },
] as const;
export function presetGraphics(id: string, previous?: Graphics): Graphics {
  const preset = graphicsPresets.find((p) => p.id === id) || graphicsPresets[0];
  return graphicsSchema.parse({
    version: 1,
    panelTop: preset.panelTop,
    headlineX: 5,
    headlineY: preset.headlineY,
    headlineWidth: 90,
    headlineHeight: preset.headlineHeight,
    fontSize: 64,
    align: preset.align,
    logoX: 72,
    logoY: 87,
    logoWidth: 23,
    logoHeight: 8,
    logoAssetId: previous?.logoAssetId || null,
    logoSha256: previous?.logoSha256 || "",
  });
}
export function graphicsBox(
  g: Graphics,
  layer: "headline" | "logo",
  width: number,
  height: number,
) {
  const left = Math.round((width * g[`${layer}X`]) / 100);
  const top = Math.round((height * g[`${layer}Y`]) / 100);
  return {
    left,
    top,
    width: Math.min(
      width - left,
      Math.round((width * g[`${layer}Width`]) / 100),
    ),
    height: Math.min(
      height - top,
      Math.round((height * g[`${layer}Height`]) / 100),
    ),
  };
}
