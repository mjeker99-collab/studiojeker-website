import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import styles from "./TextLink.module.css";

type TextLinkProps = ComponentPropsWithoutRef<typeof Link> & {
  children: ReactNode;
  inverse?: boolean;
  className?: string;
};

export function TextLink({
  children,
  inverse = false,
  className,
  ...props
}: TextLinkProps) {
  const classes = [styles.link, inverse ? styles.inverse : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <Link className={classes} {...props}>
      {children}
    </Link>
  );
}
