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

  return (
    <Tag
      ref={ref as never}
      className={[styles.reveal, visible ? styles.visible : "", className]
        .filter(Boolean)
        .join(" ")}
      style={{ transitionDelay: visible ? `${delayMs}ms` : "0ms" }}
    >
      {children}
    </Tag>
  );
}
