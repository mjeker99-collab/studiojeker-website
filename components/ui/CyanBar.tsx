import styles from "./CyanBar.module.css";

type CyanBarProps = {
  /** signature = thick media accent; edge = left page/module accent */
  variant?: "signature" | "edge";
  orientation?: "vertical" | "horizontal";
  /**
   * Pin bar top/bottom to the nearest positioned media box
   * (exact image height — no independent stretch).
   */
  boundToMedia?: boolean;
  className?: string;
  animated?: boolean;
};

export function CyanBar({
  variant = "signature",
  orientation = "vertical",
  boundToMedia = false,
  className,
  animated = true,
}: CyanBarProps) {
  const isEdge = variant === "edge";
  const isHorizontal = !isEdge && orientation === "horizontal";
  const runAnimation = animated && !boundToMedia && !isHorizontal;

  return (
    <div
      className={[
        styles.bar,
        isEdge ? styles.edge : "",
        !isEdge && !isHorizontal ? styles.vertical : "",
        isHorizontal ? styles.horizontal : "",
        boundToMedia ? styles.mediaBound : "",
        runAnimation ? styles.animated : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    />
  );
}
