"use client";

import { layoutClass } from "@/lib/layout/chrome";
import { useChrome } from "./ChromeCoordinator";
import { useKeyboardHeight } from "./KeyboardCoordinator";
import { useSafeArea } from "./SafeAreaProvider";
import { useNavigationChrome } from "./NavigationCoordinator";

export { layoutClass };

export function useChromeInsets() {
  const chrome = useChrome();
  const safe = useSafeArea();
  const keyboard = useKeyboardHeight();
  const nav = useNavigationChrome();

  return {
    mode: chrome.mode,
    chromeTop: chrome.chromeTop,
    chromeBottom: chrome.chromeBottom,
    safe,
    keyboard,
    /** Content padding classes driven by chrome mode */
    contentClassName: [
      nav.needsBottomPad ? layoutClass.pbLayout : "",
      nav.needsTopPad ? layoutClass.ptLayout : "",
    ]
      .filter(Boolean)
      .join(" "),
    /** Position above bottom chrome (FABs, toasts, sticky ask) */
    bottomChromeClass: layoutClass.bottomChrome,
    topChromeClass: layoutClass.topChrome,
    stickyBelowNavClass: layoutClass.stickyBelowNav,
  };
}
