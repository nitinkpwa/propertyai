"use client";

import { useEffect, useState, type ReactNode } from "react";

/** Soft cross-fade when `swapKey` changes — no jump, no flash. */
export function FadeSwap({
  swapKey,
  className = "",
  children,
}: {
  swapKey: string | number;
  className?: string;
  children: ReactNode;
}) {
  const [visible, setVisible] = useState(true);
  const [displayKey, setDisplayKey] = useState(swapKey);
  const [displayChildren, setDisplayChildren] = useState(children);

  useEffect(() => {
    if (swapKey === displayKey) {
      setDisplayChildren(children);
      return;
    }

    setVisible(false);
    const t = window.setTimeout(() => {
      setDisplayChildren(children);
      setDisplayKey(swapKey);
      // Next frame → fade in
      window.requestAnimationFrame(() => setVisible(true));
    }, 160);

    return () => window.clearTimeout(t);
    // Intentionally only react to swapKey; children captured at transition time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swapKey]);

  return (
    <div
      className={`transition-all duration-300 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-0.5 opacity-0"
      } ${className}`}
    >
      {displayChildren}
    </div>
  );
}
