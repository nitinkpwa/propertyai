"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "areaiq_tribute_seen";

/**
 * One-time Welcome Tribute — shows only for first-time visitors.
 * Hydration-safe: never reads localStorage during render.
 */
export function useTribute() {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY) === "true";
      setOpen(!seen);
    } catch {
      setOpen(false);
    } finally {
      setReady(true);
    }
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      /* private mode / quota */
    }
    setOpen(false);
  }, []);

  return {
    /** True after client storage check completes */
    ready,
    /** Whether the tribute overlay should be visible */
    open: ready && open,
    dismiss,
  };
}
