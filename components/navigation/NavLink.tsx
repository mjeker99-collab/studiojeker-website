"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type NavLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  inverse?: boolean;
  /** Treat as active when pathname starts with this prefix (e.g. /services). */
  matchPrefix?: string;
};

function stripHash(href: string): string {
  const index = href.indexOf("#");
  return index >= 0 ? href.slice(0, index) : href;
}

export function NavLink({
  href,
  className,
  children,
  onClick,
  matchPrefix,
}: NavLinkProps) {
  const pathname = usePathname() || "/";
  const pathOnly = stripHash(href);

  const isActive = matchPrefix
    ? pathname === matchPrefix ||
      pathname.startsWith(`${matchPrefix}/`) ||
      pathname === `/en${matchPrefix}` ||
      pathname.startsWith(`/en${matchPrefix}/`)
    : pathname === pathOnly ||
      (pathOnly !== "/" &&
        pathOnly !== "/en" &&
        pathOnly !== "" &&
        pathname.startsWith(pathOnly));

  return (
    <Link
      href={href}
      className={className}
      aria-current={isActive ? "page" : undefined}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}
