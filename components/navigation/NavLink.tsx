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
};

export function NavLink({
  href,
  className,
  children,
  onClick,
}: NavLinkProps) {
  const pathname = usePathname() || "/";
  const isActive =
    pathname === href || (href !== "/" && href !== "/en" && pathname.startsWith(href));

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
