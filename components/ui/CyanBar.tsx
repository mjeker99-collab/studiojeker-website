import styles from "./CyanBar.module.css";

type CyanBarProps = {
  orientation?: "vertical" | "horizontal";
  className?: string;
  animated?: boolean;
};

export function CyanBar({
  orientation = "vertical",
  className,
  animated = true,
}: CyanBarProps) {
  return (
    <span
      className={[
        styles.bar,
        orientation === "horizontal" ? styles.horizontal : styles.vertical,
        animated ? styles.animated : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    />
  );
}
