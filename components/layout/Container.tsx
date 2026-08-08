import type { ReactNode } from "react";

type ContainerProps = {
  children: ReactNode;
  narrow?: boolean;
  className?: string;
  as?: "div" | "section" | "header" | "footer" | "main";
};

export function Container({
  children,
  narrow = false,
  className,
  as: Tag = "div",
}: ContainerProps) {
  const classes = [narrow ? "container--narrow" : "container", className]
    .filter(Boolean)
    .join(" ");

  return <Tag className={classes}>{children}</Tag>;
}
