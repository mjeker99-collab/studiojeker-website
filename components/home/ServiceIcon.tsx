import styles from "./ServiceIcon.module.css";

type ServiceIconProps = {
  id: "architecture" | "product" | "business" | "digital";
};

export function ServiceIcon({ id }: ServiceIconProps) {
  return (
    <span className={styles.icon} aria-hidden="true">
      {id === "architecture" ? (
        <svg viewBox="0 0 48 48" fill="none">
          <path
            d="M24 8l14 8v16L24 40 10 32V16l14-8Z"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <path d="M24 8v32M10 16l14 8 14-8" stroke="currentColor" strokeWidth="1.75" />
        </svg>
      ) : null}
      {id === "product" ? (
        <svg viewBox="0 0 48 48" fill="none">
          <rect x="10" y="14" width="28" height="20" stroke="currentColor" strokeWidth="1.75" />
          <circle cx="24" cy="24" r="6" stroke="currentColor" strokeWidth="1.75" />
          <circle cx="24" cy="24" r="2" fill="currentColor" />
          <path d="M30 14h6v4" stroke="currentColor" strokeWidth="1.75" />
        </svg>
      ) : null}
      {id === "business" ? (
        <svg viewBox="0 0 48 48" fill="none">
          <circle cx="18" cy="16" r="5" stroke="currentColor" strokeWidth="1.75" />
          <circle cx="30" cy="18" r="4" stroke="currentColor" strokeWidth="1.75" />
          <path
            d="M8 36c2.2-7 7-10.5 10-10.5S28 29 30 36"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <path d="M28 28c2.2.5 6 2.8 8 8" stroke="currentColor" strokeWidth="1.75" />
        </svg>
      ) : null}
      {id === "digital" ? (
        <svg viewBox="0 0 48 48" fill="none">
          <rect x="10" y="10" width="22" height="28" stroke="currentColor" strokeWidth="1.75" />
          <path d="M15 28l5-7 4 4 5-8" stroke="currentColor" strokeWidth="1.75" />
          <circle cx="34" cy="34" r="6" stroke="currentColor" strokeWidth="1.75" />
          <path d="M38.5 38.5L43 43" stroke="currentColor" strokeWidth="1.75" />
        </svg>
      ) : null}
    </span>
  );
}
