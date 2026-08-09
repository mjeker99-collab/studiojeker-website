"use client";

import type { ElementType, ReactNode } from "react";
import { useReveal } from "@/hooks/useReveal";
import styles from "./Reveal.module.css";

type RevealProps = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  delayMs?: number;
};

/**
 * Single-element reveal wrapper so layout classes (e.g. mediaWrap grids)
 * apply to the same node that participates in the parent layout — critical
 * for cyan bars that stretch to parent height.
 */
export function Reveal({
  children,
  className,
  as,
  delayMs = 0,
}: RevealProps) {
  const { ref, pending, visible } = useReveal<HTMLElement>();
  const Tag = as ?? "div";

  return (
    <Tag
      ref={ref}
      className={[styles.reveal, visible ? styles.visible : "", className]
        .filter(Boolean)
        .join(" ")}
      data-pending={pending && !visible ? "true" : "false"}
      style={{ transitionDelay: visible ? `${delayMs}ms` : "0ms" }}
    >
      {children}
    </Tag>
  );
}
