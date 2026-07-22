"use client";

import Link from "next/link";
import Logo from "@/components/common/Logo";

interface MobileTopBarProps {
  title?: string;
  showLogo?: boolean;
  onSearch?: () => void;
  onNotifications?: () => void;
  onProfile?: () => void;
  onMenu?: () => void;
  notificationCount?: number;
  profileHref?: string;
  searchHref?: string;
  rightSlot?: React.ReactNode;
  className?: string;
  /** When true, bar is sticky at top (portals that hide global nav) */
  sticky?: boolean;
}

export default function MobileTopBar({
  title,
  showLogo = true,
  onSearch,
  onNotifications,
  onProfile,
  onMenu,
  notificationCount = 0,
  profileHref,
  searchHref = "/properties",
  rightSlot,
  className = "",
  sticky = true,
}: MobileTopBarProps) {
  return (
    <header
      className={`${
        sticky ? "sticky top-0 z-30" : ""
      } flex min-h-16 items-center gap-2 border-b border-neutral-200/80 bg-white/95 px-3 backdrop-blur-xl pt-safe md:hidden ${className}`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {showLogo ? (
          <Link href="/" className="shrink-0" aria-label="AreaIQ home">
            <Logo size="navbar" iconOnly href={null} />
          </Link>
        ) : null}
        {title ? (
          <h1 className="truncate text-base font-semibold text-heading-primary">{title}</h1>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {rightSlot}
        {(onSearch || searchHref) && (
          <IconBtn
            href={!onSearch ? searchHref : undefined}
            onClick={onSearch}
            label="Search"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
          </IconBtn>
        )}
        {onNotifications ? (
          <IconBtn onClick={onNotifications} label="Notifications">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {notificationCount > 0 ? (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-brand" />
            ) : null}
          </IconBtn>
        ) : null}
        {onProfile || profileHref ? (
          <IconBtn
            href={!onProfile ? profileHref : undefined}
            onClick={onProfile}
            label="Profile"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </IconBtn>
        ) : null}
        {onMenu ? (
          <IconBtn onClick={onMenu} label="Menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          </IconBtn>
        ) : null}
      </div>
    </header>
  );
}

function IconBtn({
  children,
  onClick,
  href,
  label,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  label: string;
}) {
  const className =
    "relative inline-flex h-11 w-11 items-center justify-center rounded-xl text-body transition-colors active:bg-neutral-100";

  if (href) {
    return (
      <Link href={href} className={className} aria-label={label}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className} aria-label={label}>
      {children}
    </button>
  );
}
