"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IQ_GREEN } from "./theme";

export default function StickyAskBar() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const submit = () => {
    const q = query.trim();
    if (!q) {
      router.push("/ask");
      return;
    }
    router.push(`/ask?q=${encodeURIComponent(q)}`);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200/80 bg-white/90 px-4 py-3 backdrop-blur-lg sm:hidden">
      <div className="mx-auto flex max-w-lg gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Ask AreaIQ anything…"
          className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-input placeholder:text-placeholder outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
        />
        <button
          type="button"
          onClick={submit}
          className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold text-white"
          style={{ backgroundColor: IQ_GREEN }}
        >
          Ask
        </button>
      </div>
    </div>
  );
}
