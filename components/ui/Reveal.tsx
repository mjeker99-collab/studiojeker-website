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
  const { ref, pending, visible } = useReveal<HTMLDivElement>();
  const Tag = as ?? "div";

  return (
    <div
      ref={ref}
      className={[styles.reveal, visible ? styles.visible : ""]
        .filter(Boolean)
        .join(" ")}
      data-pending={pending && !visible ? "true" : "false"}
      style={{ transitionDelay: visible ? `${delayMs}ms` : "0ms" }}
    >
      <Tag className={className}>{children}</Tag>
    </div>
  );
}
