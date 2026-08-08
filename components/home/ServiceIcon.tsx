import styles from "./ServiceIcon.module.css";

type ServiceIconProps = {
  id: "architecture" | "product" | "business" | "digital";
};

export function ServiceIcon({ id }: ServiceIconProps) {
  return (
    <span className={styles.icon} aria-hidden="true">
      {id === "architecture" ? (
        <svg viewBox="0 0 48 48" fill="none">
          <path d="M10 34V14l14-8 14 8v20H10Z" stroke="currentColor" strokeWidth="2" />
          <path d="M18 34V22h12v12" stroke="currentColor" strokeWidth="2" />
        </svg>
      ) : null}
      {id === "product" ? (
        <svg viewBox="0 0 48 48" fill="none">
          <rect x="10" y="14" width="28" height="20" rx="3" stroke="currentColor" strokeWidth="2" />
          <circle cx="24" cy="24" r="6" stroke="currentColor" strokeWidth="2" />
          <path d="M32 14l4-4h4" stroke="currentColor" strokeWidth="2" />
        </svg>
      ) : null}
      {id === "business" ? (
        <svg viewBox="0 0 48 48" fill="none">
          <circle cx="18" cy="18" r="5" stroke="currentColor" strokeWidth="2" />
          <circle cx="30" cy="18" r="5" stroke="currentColor" strokeWidth="2" />
          <path d="M8 36c2.5-6 7-9 10-9s7.5 3 10 9" stroke="currentColor" strokeWidth="2" />
          <path d="M28 27c2 .4 5.2 2.2 8 9" stroke="currentColor" strokeWidth="2" />
        </svg>
      ) : null}
      {id === "digital" ? (
        <svg viewBox="0 0 48 48" fill="none">
          <path d="M8 34V14h28v20H8Z" stroke="currentColor" strokeWidth="2" />
          <path d="M14 28l6-8 6 5 6-9" stroke="currentColor" strokeWidth="2" />
          <path d="M36 20h4v14H12" stroke="currentColor" strokeWidth="2" />
        </svg>
      ) : null}
    </span>
  );
}
