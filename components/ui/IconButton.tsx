"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ui } from "@/lib/design/tokens";

type IconButtonProps = {
  label: string;
  children: ReactNode;
  href?: string;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className">;

/** 44×44 minimum touch target icon control */
export default function IconButton({
  label,
  children,
  href,
  className = "",
  type = "button",
  ...rest
}: IconButtonProps) {
  const classes = `${ui.iconBtn} ${className}`.trim();

  if (href) {
    return (
      <Link href={href} className={classes} aria-label={label}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} aria-label={label} {...rest}>
      {children}
    </button>
  );
}
