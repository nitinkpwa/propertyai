"use client";

import Link from "next/link";
import { buyerTokens } from "@/lib/buyer/design";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonBaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingText?: string;
  className?: string;
  children: React.ReactNode;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: buyerTokens.btnPrimary,
  secondary: buyerTokens.btnSecondary,
  ghost: buyerTokens.btnGhost,
  danger:
    "inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600 transition-all hover:bg-rose-100 active:scale-[0.98] disabled:opacity-60",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "px-3 py-2 text-xs",
  md: "",
  lg: "px-6 py-3 text-base",
};

function Spinner() {
  return (
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  loadingText,
  className = "",
  children,
  type = "button",
  ...props
}: ButtonBaseProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      disabled={loading || props.disabled}
      className={`${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Spinner />
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
  className = "",
  children,
}: ButtonBaseProps & { href: string }) {
  return (
    <Link href={href} className={`${VARIANTS[variant]} ${SIZES[size]} ${className}`}>
      {children}
    </Link>
  );
}
