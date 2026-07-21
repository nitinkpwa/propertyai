"use client";

import { useEffect, useRef, useState } from "react";

function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/**
 * Rotates through a shuffled deck without repeating until every item has shown.
 * Clears timers on unmount / when `active` becomes false.
 */
export function useShuffledRotation<T>(
  items: readonly T[],
  intervalMs: number,
  active: boolean,
): T | null {
  const deckRef = useRef<T[]>([]);
  const indexRef = useRef(0);
  const [current, setCurrent] = useState<T | null>(null);

  useEffect(() => {
    if (!active || items.length === 0) {
      setCurrent(null);
      deckRef.current = [];
      indexRef.current = 0;
      return;
    }

    deckRef.current = shuffleInPlace([...items]);
    indexRef.current = 0;
    setCurrent(deckRef.current[0] ?? null);

    const id = window.setInterval(() => {
      let next = indexRef.current + 1;
      if (next >= deckRef.current.length) {
        deckRef.current = shuffleInPlace([...items]);
        next = 0;
      }
      indexRef.current = next;
      setCurrent(deckRef.current[next] ?? null);
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [active, intervalMs, items]);

  return current;
}
