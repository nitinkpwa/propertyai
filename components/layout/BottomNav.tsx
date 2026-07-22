"use client";

import Link from "next/link";
import { BottomNavIconSvg } from "@/components/layout/BottomNavIcons";
import type { BottomNavItem } from "@/lib/design/bottomNav";

interface BottomNavProps {
  items: BottomNavItem[];
  /** Active item id */
  activeId?: string;
  /** For SPA tab shells */
  onItemSelect?: (item: BottomNavItem) => void;
  className?: string;
}

export default function BottomNav({
  items,
  activeId,
  onItemSelect,
  className = "",
}: BottomNavProps) {
  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden ${className}`}
      aria-label="Primary"
    >
      <div className="flex h-16 items-stretch justify-around px-1">
        {items.map((item) => {
          const active = activeId === item.id;
          const classNames = `relative flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold transition-all duration-200 active:scale-[0.96] ${
            active ? "text-brand" : "text-muted"
          }`;

          const content = (
            <>
              <span
                className={`relative flex h-8 w-8 items-center justify-center rounded-xl transition-colors duration-200 ${
                  active ? "bg-brand/10 text-brand" : "text-muted"
                }`}
              >
                <BottomNavIconSvg icon={item.icon} />
                {item.badge && item.badge > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-0.5 text-[9px] font-bold text-white shadow-sm">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                ) : null}
              </span>
              <span className={`truncate transition-opacity ${active ? "opacity-100" : "opacity-80"}`}>
                {item.label}
              </span>
              {active ? (
                <span
                  className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-brand transition-all"
                  aria-hidden
                />
              ) : null}
            </>
          );

          if (item.href && !item.action && !onItemSelect) {
            return (
              <Link
                key={item.id}
                href={item.href}
                className={classNames}
                aria-current={active ? "page" : undefined}
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              className={classNames}
              aria-current={active ? "page" : undefined}
              onClick={() => onItemSelect?.(item)}
            >
              {content}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
