/** Predefined brand colors or a validated custom HEX value from Sanity. */
export type EditorialColorPreset = "black" | "cyan" | "white" | "custom";

export type EditorialColorValue = {
  preset?: EditorialColorPreset | "" | null;
  customHex?: string | null;
};
