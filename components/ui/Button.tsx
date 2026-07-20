"use client";

import Link from "next/link";
import { ui } from "@/lib/design/tokens";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "disabled";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonBaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingText?: string;
  fullWidth?: boolean;
  className?: string;
  children: React.ReactNode;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: `${ui.btnBase} ${ui.btnPrimary}`,
  secondary: `${ui.btnBase} ${ui.btnSecondary}`,
  ghost: `${ui.btnBase} ${ui.btnGhost}`,
  danger: `${ui.btnBase} ${ui.btnDanger}`,
  disabled: `${ui.btnBase} ${ui.btnDisabled}`,
};

const SIZES: Record<ButtonSize, string> = {
  sm: "min-h-11 px-3 text-sm",
  md: "",
  lg: "min-h-14 px-6 text-base",
};

function LoadingDots() {
  return (
    <span className="inline-flex gap-1" aria-hidden>
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current opacity-80" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current opacity-60 [animation-delay:120ms]" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current opacity-40 [animation-delay:240ms]" />
    </span>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  loadingText,
  fullWidth,
  className = "",
  children,
  type = "button",
  ...props
}: ButtonBaseProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const widthClass = fullWidth ? "!w-full" : "";
  return (
    <button
      type={type}
      disabled={loading || props.disabled || variant === "disabled"}
      className={`${VARIANTS[variant]} ${SIZES[size]} ${widthClass} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <LoadingDots />
          {loadingText ?? children}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  fullWidth,
  className = "",
  children,
}: ButtonBaseProps & { href: string }) {
  const widthClass = fullWidth ? "!w-full" : "";
  return (
    <Link
      href={href}
      className={`${VARIANTS[variant]} ${SIZES[size]} ${widthClass} ${className}`}
    >
      {children}
    </Link>
  );
}
