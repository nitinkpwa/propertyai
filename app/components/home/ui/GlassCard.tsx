import type { ReactNode } from "react";
import Link from "next/link";
import { GLASS_CARD_CLASS } from "../theme";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
}

export default function GlassCard({ children, className = "", href, onClick }: GlassCardProps) {
  const cls = `${GLASS_CARD_CLASS} ${className}`;

  if (href) {
    return (
      <Link href={href} className={`group block no-underline ${cls}`}>
        {children}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`text-left ${cls}`}>
        {children}
      </button>
    );
  }

  return <div className={cls}>{children}</div>;
}
