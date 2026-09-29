"use client";

import type { ElementType, ReactNode } from "react";
import { useReveal } from "@/hooks/useReveal";
import styles from "./Reveal.module.css";

type RevealProps = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  delayMs?: number;
  /**
   * Keep content visible from first paint (no opacity:0 pending phase).
   * Use for LCP hero media so posters are never briefly blanked.
   * Does not change other Reveal call sites.
   */
  immediate?: boolean;
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
  immediate = false,
}: RevealProps) {
  const { ref, pending, visible } = useReveal<HTMLElement>();
  const Tag = as ?? "div";
  const showPending = !immediate && pending && !visible;

  return (
    <Tag
      ref={ref}
      className={[
        styles.reveal,
        immediate || visible ? styles.visible : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-pending={showPending ? "true" : "false"}
      style={{
        transitionDelay: !immediate && visible ? `${delayMs}ms` : "0ms",
      }}
    >
      {children}
    </Tag>
  );
}
