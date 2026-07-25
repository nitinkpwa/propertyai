"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { CSS_VARS } from "@/lib/layout/chrome";

const KeyboardContext = createContext(0);

function publishKeyboard(height: number) {
  document.documentElement.style.setProperty(
    CSS_VARS.keyboardHeight,
    `${Math.max(0, Math.round(height))}px`,
  );
}

export function KeyboardCoordinator({ children }: { children: ReactNode }) {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) {
      publishKeyboard(0);
      return;
    }

    const update = () => {
      const overlap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardHeight(overlap);
      publishKeyboard(overlap);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      publishKeyboard(0);
    };
  }, []);

  return (
    <KeyboardContext.Provider value={keyboardHeight}>
      {children}
    </KeyboardContext.Provider>
  );
}

export function useKeyboardHeight(): number {
  return useContext(KeyboardContext);
}

/** Scroll focused form control into view above keyboard + chrome */
export function scrollFieldIntoView(el: HTMLElement | null) {
  if (!el) return;
  requestAnimationFrame(() => {
    el.scrollIntoView({ block: "center", behavior: "smooth", inline: "nearest" });
  });
}
