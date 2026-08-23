import type { EditorialColorValue } from "@/types/editorial-color";

export type SanityEditorialColor = {
  preset?: EditorialColorValue["preset"];
  customHex?: string | null;
} | null;

/** Keep in sync with PHP proxy projections. */
export const editorialColorProjection = `{ preset, customHex }`;

/** Pass through CMS color only when a preset is explicitly chosen. */
export function pickEditorialColor(
  value: SanityEditorialColor | undefined,
): EditorialColorValue | undefined {
  if (!value?.preset) {
    return undefined;
  }

  return {
    preset: value.preset,
    customHex: value.customHex,
  };
}
