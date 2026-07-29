"use client";

import { useCallback, useEffect } from "react";

const STORAGE_KEY = "areaiq_tribute_seen";

/**
 * Expired memorial tribute — permanently disabled (event window ended).
 */
export function useTribute() {
  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      /* private mode / quota */
    }
  }, []);

  useEffect(() => {
    // Ensure legacy visitors never re-see the expired overlay.
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      /* ignore */
    }
  }, []);

  return {
    ready: true,
    open: false,
    dismiss,
  };
}
