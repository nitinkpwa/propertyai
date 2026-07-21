"use client";

import { useEffect, useState } from "react";

/** Soft indeterminate → elapsed progress bar (never claims 100% until done). */
export function LoadingProgress({ active }: { active: boolean }) {
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    if (!active) {
      setProgress(8);
      return;
    }

    setProgress(12);
    const started = Date.now();
    const id = window.setInterval(() => {
      const elapsed = Date.now() - started;
      // Asymptotic approach toward ~92% so it never looks stuck or finished.
      const next = 12 + (80 * (1 - Math.exp(-elapsed / 14000)));
      setProgress(Math.min(92, next));
    }, 200);

    return () => window.clearInterval(id);
  }, [active]);

  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-emerald-50"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
      aria-label="Analysis progress"
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-brand to-emerald-600 transition-[width] duration-500 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
