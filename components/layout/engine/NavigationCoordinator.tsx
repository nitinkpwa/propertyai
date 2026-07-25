"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import {
  modeNeedsBottomPad,
  modeNeedsTopPad,
  resolveChromeMode,
} from "@/lib/layout/chrome";
import type { ChromeMode } from "@/lib/layout/types";

interface NavigationContextValue {
  pathname: string;
  mode: ChromeMode;
  needsBottomPad: boolean;
  needsTopPad: boolean;
  showPublicBottomNav: boolean;
  showPublicNavbar: boolean;
}

const NavigationContext = createContext<NavigationContextValue>({
  pathname: "/",
  mode: "public",
  needsBottomPad: true,
  needsTopPad: false,
  showPublicBottomNav: true,
  showPublicNavbar: true,
});

export function NavigationCoordinator({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const value = useMemo<NavigationContextValue>(() => {
    const mode = resolveChromeMode(pathname);
    return {
      pathname,
      mode,
      needsBottomPad: modeNeedsBottomPad(mode),
      needsTopPad: modeNeedsTopPad(mode),
      showPublicBottomNav: mode === "public",
      showPublicNavbar: mode === "public" || mode === "property",
    };
  }, [pathname]);

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigationChrome(): NavigationContextValue {
  return useContext(NavigationContext);
}
