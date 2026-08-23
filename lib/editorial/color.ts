import type { CSSProperties } from "react";
import type { EditorialColorValue } from "@/types/editorial-color";
import styles from "@/styles/editorial-color.module.css";

const HEX_PATTERN = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

export function isValidHex(value: string): boolean {
  return HEX_PATTERN.test(value.trim());
}

function normalizeHex(value: string): string {
  const trimmed = value.trim();
  if (/^#[0-9A-Fa-f]{3}$/.test(trimmed)) {
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return trimmed.toUpperCase();
}

export type ResolvedEditorialColor = {
  className?: string;
  style?: CSSProperties;
};

/** Map Sanity editorial color to a token class or validated inline HEX. */
export function resolveEditorialColor(
  color?: EditorialColorValue | null,
): ResolvedEditorialColor {
  const preset = color?.preset;
  if (!preset) {
    return {};
  }

  switch (preset) {
    case "black":
      return { className: styles.black };
    case "cyan":
      return { className: styles.cyan };
    case "white":
      return { className: styles.white };
    case "custom": {
      const hex = color.customHex?.trim();
      if (hex && isValidHex(hex)) {
        return { style: { color: normalizeHex(hex) } };
      }
      return {};
    }
    default:
      return {};
  }
}

export function hasEditorialColor(color?: EditorialColorValue | null): boolean {
  const resolved = resolveEditorialColor(color);
  return Boolean(resolved.className || resolved.style);
}
