"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FLOATING_AI_ACTIONS } from "@/lib/home/content";
import { IQ_GREEN } from "./theme";

export default function FloatingAIButton() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div
      ref={panelRef}
      className="fixed bottom-6 right-6 z-50 hidden sm:bottom-8 sm:right-8 sm:block"
    >
      {open ? (
        <div
          className="absolute bottom-16 right-0 mb-2 w-56 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.12)]"
          role="menu"
          aria-label="AreaIQ quick actions"
        >
          <p className="border-b border-neutral-100 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-label">
            Ask AreaIQ
          </p>
          <ul className="py-1">
            {FLOATING_AI_ACTIONS.map((action) => (
              <li key={action.id}>
                <Link
                  href={action.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2.5 text-sm font-medium text-body no-underline transition-colors hover:bg-emerald-50 hover:text-heading-primary"
                >
                  {action.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_8px_32px_rgba(22,199,132,0.45)] transition-transform hover:scale-105 active:scale-95 sm:h-16 sm:w-16"
        style={{ backgroundColor: IQ_GREEN }}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={open ? "Close AreaIQ actions" : "Open AreaIQ actions"}
      >
        <span className="text-xl font-bold sm:text-2xl" aria-hidden>
          {open ? "×" : "✦"}
        </span>
      </button>
    </div>
  );
}
