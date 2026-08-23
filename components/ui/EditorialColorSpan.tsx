import type { ReactNode } from "react";
import type { EditorialColorValue } from "@/types/editorial-color";
import {
  hasEditorialColor,
  resolveEditorialColor,
} from "@/lib/editorial/color";

type EditorialColorSpanProps = {
  color?: EditorialColorValue | null;
  /** Applied when no CMS color is set — preserves existing CSS defaults. */
  fallbackClassName?: string;
  className?: string;
  children: ReactNode;
};

/**
 * Applies CMS editorial text color without changing typography or layout.
 * Falls back to existing CSS module classes when the field is empty.
 */
export function EditorialColorSpan({
  color,
  fallbackClassName,
  className,
  children,
}: EditorialColorSpanProps) {
  const resolved = resolveEditorialColor(color);
  const cmsColorActive = hasEditorialColor(color);

  const classes = [
    className,
    cmsColorActive ? resolved.className : fallbackClassName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={classes || undefined}
      style={cmsColorActive ? resolved.style : undefined}
    >
      {children}
    </span>
  );
}
