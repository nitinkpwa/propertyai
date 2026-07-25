"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { CSS_VARS } from "@/lib/layout/chrome";
import type { SafeAreaInsets } from "@/lib/layout/types";

const SafeAreaContext = createContext<SafeAreaInsets>({
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
});

function measureSafeArea(): SafeAreaInsets {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;padding-top:env(safe-area-inset-top);padding-right:env(safe-area-inset-right);padding-bottom:env(safe-area-inset-bottom);padding-left:env(safe-area-inset-left);pointer-events:none;";
  document.documentElement.appendChild(probe);
  const style = getComputedStyle(probe);
  const insets = {
    top: parseFloat(style.paddingTop) || 0,
    right: parseFloat(style.paddingRight) || 0,
    bottom: parseFloat(style.paddingBottom) || 0,
    left: parseFloat(style.paddingLeft) || 0,
  };
  probe.remove();
  return insets;
}

function publishSafeArea(insets: SafeAreaInsets) {
  const root = document.documentElement;
  root.style.setProperty(CSS_VARS.safeTop, `${insets.top}px`);
  root.style.setProperty(CSS_VARS.safeRight, `${insets.right}px`);
  root.style.setProperty(CSS_VARS.safeBottom, `${insets.bottom}px`);
  root.style.setProperty(CSS_VARS.safeLeft, `${insets.left}px`);
}

export function SafeAreaProvider({ children }: { children: ReactNode }) {
  const [insets, setInsets] = useState<SafeAreaInsets>({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  useEffect(() => {
    const update = () => {
      const next = measureSafeArea();
      setInsets(next);
      publishSafeArea(next);
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return (
    <SafeAreaContext.Provider value={insets}>{children}</SafeAreaContext.Provider>
  );
}

export function useSafeArea(): SafeAreaInsets {
  return useContext(SafeAreaContext);
}
