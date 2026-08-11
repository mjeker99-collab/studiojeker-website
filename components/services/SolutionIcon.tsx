import type { ServiceSolutionItem } from "@/types/service-page";
import styles from "@/components/home/ServiceIcon.module.css";

type SolutionIconProps = {
  id: ServiceSolutionItem["icon"];
};

export function SolutionIcon({ id }: SolutionIconProps) {
  return (
    <span className={styles.icon} aria-hidden="true">
      {id === "film" || id === "product-film" ? (
        <svg viewBox="0 0 48 48" fill="none">
          <rect x="8" y="12" width="32" height="24" stroke="currentColor" strokeWidth="1.6" />
          <path d="M20 20l10 6-10 6V20Z" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      ) : null}
      {id === "portrait" ? (
        <svg viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="18" r="6" stroke="currentColor" strokeWidth="1.6" />
          <path d="M12 36c2.5-8 7.5-12 12-12s9.5 4 12 12" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      ) : null}
      {id === "reportage" ? (
        <svg viewBox="0 0 48 48" fill="none">
          <rect x="10" y="12" width="28" height="24" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="20" cy="22" r="3.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M14 32l7-7 5 4 8-9" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      ) : null}
      {id === "internal" || id === "social" ? (
        <svg viewBox="0 0 48 48" fill="none">
          <path d="M14 18h20M14 24h14M14 30h18" stroke="currentColor" strokeWidth="1.6" />
          <rect x="10" y="10" width="28" height="28" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      ) : null}
      {id === "product-photo" ? (
        <svg viewBox="0 0 48 48" fill="none">
          <rect x="10" y="14" width="28" height="20" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="24" cy="24" r="6.5" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="24" cy="24" r="2" fill="currentColor" />
        </svg>
      ) : null}
      {id === "viz3d" || id === "architecture" ? (
        <svg viewBox="0 0 48 48" fill="none">
          <path d="M24 6l14 8v8l-14 8-14-8v-8l14-8Z" stroke="currentColor" strokeWidth="1.6" />
          <path d="M10 14l14 8 14-8M24 22v16" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      ) : null}
      {id === "animation" ? (
        <svg viewBox="0 0 48 48" fill="none">
          <path d="M10 30l8-14 7 8 6-10 7 16" stroke="currentColor" strokeWidth="1.6" />
          <rect x="8" y="10" width="32" height="28" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      ) : null}
      {id === "drone" ? (
        <svg viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="4" stroke="currentColor" strokeWidth="1.6" />
          <path d="M12 16h8M28 16h8M12 32h8M28 32h8" stroke="currentColor" strokeWidth="1.6" />
          <path d="M16 16l6 6M32 16l-6 6M16 32l6-6M32 32l-6-6" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      ) : null}
      {id === "tour" ? (
        <svg viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="10" stroke="currentColor" strokeWidth="1.6" />
          <path d="M14 24h20M24 14c3 3.5 3 12.5 0 20M24 14c-3 3.5-3 12.5 0 20" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      ) : null}
      {id === "strategy" ? (
        <svg viewBox="0 0 48 48" fill="none">
          <path d="M12 32l8-10 6 5 10-14" stroke="currentColor" strokeWidth="1.6" />
          <rect x="10" y="10" width="28" height="28" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      ) : null}
      {id === "content" ? (
        <svg viewBox="0 0 48 48" fill="none">
          <rect x="12" y="10" width="24" height="28" stroke="currentColor" strokeWidth="1.6" />
          <path d="M18 18h12M18 24h12M18 30h8" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      ) : null}
      {id === "abo" ? (
        <svg viewBox="0 0 48 48" fill="none">
          <rect x="12" y="10" width="24" height="28" stroke="currentColor" strokeWidth="1.6" />
          <path d="M18 8v4M30 8v4M16 20h16M16 26h10" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      ) : null}
    </span>
  );
}
