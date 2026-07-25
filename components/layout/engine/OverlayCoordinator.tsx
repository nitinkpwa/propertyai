"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getOverlayStack,
  subscribeOverlays,
  type OverlayRegistration,
} from "@/lib/layout/overlay";

interface OverlayContextValue {
  stack: OverlayRegistration[];
  depth: number;
  hasOverlay: boolean;
}

const OverlayContext = createContext<OverlayContextValue>({
  stack: [],
  depth: 0,
  hasOverlay: false,
});

export function OverlayCoordinator({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<OverlayRegistration[]>(() =>
    getOverlayStack(),
  );

  useEffect(() => subscribeOverlays(setStack), []);

  const value = useMemo<OverlayContextValue>(
    () => ({
      stack,
      depth: stack.length,
      hasOverlay: stack.length > 0,
    }),
    [stack],
  );

  return (
    <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>
  );
}

export function useOverlayStack(): OverlayContextValue {
  return useContext(OverlayContext);
}
