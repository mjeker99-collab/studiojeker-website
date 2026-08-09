import styles from "./Arrow.module.css";

type ArrowProps = {
  className?: string;
};

/**
 * Shared cyan arrow for cards and text links.
 * Position via parent flex/grid — do not offset per instance.
 */
export function Arrow({ className }: ArrowProps) {
  return (
    <span
      className={[styles.arrow, className].filter(Boolean).join(" ")}
      aria-hidden="true"
    >
      →
    </span>
  );
}
