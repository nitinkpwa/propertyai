"use client";

import type { ReactNode } from "react";
import { ViewportProvider } from "./ViewportProvider";
import { SafeAreaProvider } from "./SafeAreaProvider";
import { KeyboardCoordinator } from "./KeyboardCoordinator";
import { NavigationCoordinator, useNavigationChrome } from "./NavigationCoordinator";
import { ChromeCoordinator } from "./ChromeCoordinator";
import { OverlayCoordinator } from "./OverlayCoordinator";
import { OverlayHost } from "./OverlayHost";

function ChromeBridge({ children }: { children: ReactNode }) {
  const { mode } = useNavigationChrome();
  return <ChromeCoordinator mode={mode}>{children}</ChromeCoordinator>;
}

/**
 * Single source of truth for mobile layout:
 * viewport, safe area, keyboard, chrome insets, navigation mode, overlays.
 */
export default function LayoutProvider({ children }: { children: ReactNode }) {
  return (
    <ViewportProvider>
      <SafeAreaProvider>
        <KeyboardCoordinator>
          <NavigationCoordinator>
            <ChromeBridge>
              <OverlayCoordinator>
                <OverlayHost />
                {children}
              </OverlayCoordinator>
            </ChromeBridge>
          </NavigationCoordinator>
        </KeyboardCoordinator>
      </SafeAreaProvider>
    </ViewportProvider>
  );
}
