import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import styles from "./Button.module.css";

type Variant = "primary" | "secondary" | "ghost";

type CommonProps = {
  children: ReactNode;
  variant?: Variant;
  showArrow?: boolean;
  fullWidthMobile?: boolean;
  className?: string;
};

type ButtonAsButton = CommonProps &
  Omit<ComponentPropsWithoutRef<"button">, "className" | "children"> & {
    href?: undefined;
  };

type ButtonAsLink = CommonProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, "className" | "children"> & {
    href: string;
  };

type ButtonProps = ButtonAsButton | ButtonAsLink;

function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function Button(props: ButtonProps) {
  const {
    children,
    variant = "primary",
    showArrow = true,
    fullWidthMobile = false,
    className,
    ...rest
  } = props;

  const classes = cx(
    styles.button,
    styles[variant],
    fullWidthMobile && styles.fullWidthMobile,
    className,
  );

  const content = (
    <>
      <span>{children}</span>
      {showArrow ? <span className={styles.arrow} aria-hidden="true">→</span> : null}
    </>
  );

  if ("href" in rest && rest.href) {
    const { href, ...linkRest } = rest;
    return (
      <Link href={href} className={classes} {...linkRest}>
        {content}
      </Link>
    );
  }

  const buttonRest = rest as ButtonAsButton;
  return (
    <button className={classes} type={buttonRest.type ?? "button"} {...buttonRest}>
      {content}
    </button>
  );
}
