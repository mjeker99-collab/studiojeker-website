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

export function Reveal({
  children,
  className,
  as,
  delayMs = 0,
}: RevealProps) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  const Tag = as ?? "div";

  // Always observe a real div ref. Polymorphic refs were unreliable and could
  // leave homepage sections stuck at opacity: 0.
  return (
    <div
      ref={ref}
      className={[styles.reveal, visible ? styles.visible : ""]
        .filter(Boolean)
        .join(" ")}
      style={{ transitionDelay: visible ? `${delayMs}ms` : "0ms" }}
    >
      <Tag className={className}>{children}</Tag>
    </div>
  );
}
