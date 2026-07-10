"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "./utils";

interface FilterDropdownProps {
  label: string;
  activeCount?: number;
  children: React.ReactNode;
  align?: "left" | "right";
}

export default function FilterDropdown({
  label,
  activeCount = 0,
  children,
  align = "left",
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 hover:shadow-sm active:scale-[0.98]",
          open || activeCount > 0
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-neutral-200 bg-white text-body hover:border-neutral-300 hover:bg-neutral-50",
        )}
      >
        {label}
        {activeCount > 0 && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[11px] font-bold text-white">
            {activeCount}
          </span>
        )}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={cn("transition-transform duration-200", open && "rotate-180")}
          aria-hidden
        >
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          className={cn(
            "absolute top-[calc(100%+8px)] z-30 w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_12px_40px_rgba(0,0,0,0.1)]",
            align === "right" ? "right-0" : "left-0",
          )}
          onMouseDown={(event) => event.stopPropagation()}
        >
          {children}
        </div>
      )}
    </div>
  );
}
