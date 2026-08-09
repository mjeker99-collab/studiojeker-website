import styles from "./CyanBar.module.css";

type CyanBarProps = {
  /** signature = thick media accent; edge = left page/module accent */
  variant?: "signature" | "edge";
  orientation?: "vertical" | "horizontal";
  className?: string;
  animated?: boolean;
};

export function CyanBar({
  variant = "signature",
  orientation = "vertical",
  className,
  animated = true,
}: CyanBarProps) {
  const isEdge = variant === "edge";
  const isHorizontal = !isEdge && orientation === "horizontal";

  return (
    <div
      className={[
        styles.bar,
        isEdge ? styles.edge : "",
        !isEdge && !isHorizontal ? styles.vertical : "",
        isHorizontal ? styles.horizontal : "",
        !isEdge && animated ? styles.animated : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    />
  );
}
