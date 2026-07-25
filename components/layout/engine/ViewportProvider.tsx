"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { breakpoints } from "@/lib/design/tokens";
import type { BreakpointName, Orientation, ViewportState } from "@/lib/layout/types";

const ViewportContext = createContext<ViewportState>({
  width: 0,
  height: 0,
  orientation: "portrait",
  breakpoint: "xs",
  isMobile: true,
  isTablet: false,
  isDesktop: false,
});

function resolveBreakpoint(width: number): BreakpointName {
  if (width >= breakpoints.xl) return "xl";
  if (width >= breakpoints.lg) return "lg";
  if (width >= breakpoints.md) return "md";
  if (width >= breakpoints.sm) return "sm";
  return "xs";
}

function readViewport(): ViewportState {
  if (typeof window === "undefined") {
    return {
      width: 0,
      height: 0,
      orientation: "portrait",
      breakpoint: "xs",
      isMobile: true,
      isTablet: false,
      isDesktop: false,
    };
  }
  const width = window.innerWidth;
  const height = window.innerHeight;
  const breakpoint = resolveBreakpoint(width);
  const orientation: Orientation =
    width > height ? "landscape" : "portrait";
  return {
    width,
    height,
    orientation,
    breakpoint,
    isMobile: width < breakpoints.md,
    isTablet: width >= breakpoints.md && width < breakpoints.lg,
    isDesktop: width >= breakpoints.lg,
  };
}

export function ViewportProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ViewportState>(readViewport);

  useEffect(() => {
    const update = () => setState(readViewport());
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return (
    <ViewportContext.Provider value={state}>{children}</ViewportContext.Provider>
  );
}

export function useViewport(): ViewportState {
  return useContext(ViewportContext);
}
