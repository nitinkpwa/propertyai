"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  CHROME,
  CSS_VARS,
  computeChromeInsets,
  defaultSlotHeight,
} from "@/lib/layout/chrome";
import type { ChromeMode, ChromeRegistration, ChromeSlot } from "@/lib/layout/types";

type SlotMap = Partial<Record<ChromeSlot, number>>;

interface ChromeContextValue {
  mode: ChromeMode;
  slots: SlotMap;
  chromeTop: number;
  chromeBottom: number;
  registerChrome: (reg: ChromeRegistration) => () => void;
  setSlot: (slot: ChromeSlot, height: number) => void;
}

const ChromeContext = createContext<ChromeContextValue | null>(null);

function publishChrome(slots: SlotMap) {
  const root = document.documentElement;
  const navbar = slots.navbar ?? 0;
  const bottomnav = slots.bottomnav ?? 0;
  const notification = slots.notification ?? 0;
  const sticky = slots.sticky ?? 0;
  const actionbar = slots.actionbar ?? 0;
  const { top, bottom } = computeChromeInsets(slots);

  root.style.setProperty(CSS_VARS.navbarHeight, `${navbar}px`);
  root.style.setProperty(CSS_VARS.bottomnavHeight, `${bottomnav}px`);
  root.style.setProperty(CSS_VARS.notificationHeight, `${notification}px`);
  root.style.setProperty(CSS_VARS.stickyHeight, `${sticky}px`);
  root.style.setProperty(CSS_VARS.actionbarHeight, `${actionbar}px`);
  root.style.setProperty(CSS_VARS.chromeTop, `${top}px`);
  root.style.setProperty(CSS_VARS.chromeBottom, `${bottom}px`);

  root.style.setProperty(CSS_VARS.topbarH, `${navbar}px`);
  root.style.setProperty(CSS_VARS.bottomnavH, `${bottomnav}px`);
  root.style.setProperty(CSS_VARS.smartBarH, `${notification}px`);
}

function modeDefaults(mode: ChromeMode): SlotMap {
  switch (mode) {
    case "public":
      return {
        navbar: CHROME.navbar,
        bottomnav: CHROME.bottomnav,
        notification: 0,
        sticky: 0,
        actionbar: 0,
      };
    case "portal":
      return {
        navbar: CHROME.navbar,
        bottomnav: CHROME.bottomnav,
        notification: 0,
        sticky: 0,
        actionbar: 0,
      };
    case "property":
      return {
        navbar: CHROME.navbar,
        bottomnav: 0,
        notification: 0,
        sticky: 0,
        actionbar: CHROME.actionbar,
      };
    case "ask":
      return {
        navbar: CHROME.navbar,
        bottomnav: 0,
        notification: 0,
        sticky: 0,
        actionbar: 0,
      };
    case "auth":
    case "none":
    default:
      return {
        navbar: 0,
        bottomnav: 0,
        notification: 0,
        sticky: 0,
        actionbar: 0,
      };
  }
}

export function ChromeCoordinator({
  mode,
  children,
}: {
  mode: ChromeMode;
  children: ReactNode;
}) {
  const registrations = useRef<Map<string, ChromeRegistration>>(new Map());
  const [slots, setSlots] = useState<SlotMap>(() => modeDefaults(mode));

  const recompute = useCallback(() => {
    const next: SlotMap = { ...modeDefaults(mode) };
    for (const reg of registrations.current.values()) {
      next[reg.slot] = reg.height;
    }
    setSlots(next);
    if (typeof document !== "undefined") publishChrome(next);
  }, [mode]);

  useEffect(() => {
    recompute();
  }, [recompute]);

  const registerChrome = useCallback(
    (reg: ChromeRegistration) => {
      registrations.current.set(reg.id, reg);
      recompute();
      return () => {
        registrations.current.delete(reg.id);
        recompute();
      };
    },
    [recompute],
  );

  const setSlot = useCallback(
    (slot: ChromeSlot, height: number) => {
      const id = `slot-${slot}`;
      registrations.current.set(id, { id, slot, height });
      recompute();
    },
    [recompute],
  );

  const { top, bottom } = useMemo(() => computeChromeInsets(slots), [slots]);

  const value = useMemo<ChromeContextValue>(
    () => ({
      mode,
      slots,
      chromeTop: top,
      chromeBottom: bottom,
      registerChrome,
      setSlot,
    }),
    [mode, slots, top, bottom, registerChrome, setSlot],
  );

  return (
    <ChromeContext.Provider value={value}>{children}</ChromeContext.Provider>
  );
}

function useChromeContext(): ChromeContextValue {
  const ctx = useContext(ChromeContext);
  if (!ctx) {
    throw new Error("useChrome* hooks require LayoutProvider");
  }
  return ctx;
}

export function useChrome(): ChromeContextValue {
  return useChromeContext();
}

/** Register a chrome slot for the lifetime of the mounting component */
export function useRegisterChrome(
  slot: ChromeSlot,
  height: number,
  enabled = true,
  id?: string,
) {
  const { registerChrome } = useChromeContext();
  const stableId = id ?? `reg-${slot}`;

  useEffect(() => {
    if (!enabled || height <= 0) return;
    return registerChrome({ id: stableId, slot, height });
  }, [registerChrome, slot, height, enabled, stableId]);
}

/**
 * Measure an element and register its height as a chrome slot.
 * Use for MobileActionBar, sticky toolbars, etc.
 */
export function useChromeElement<T extends HTMLElement = HTMLElement>(
  slot: ChromeSlot,
  enabled = true,
  id?: string,
): RefObject<T | null> {
  const { registerChrome } = useChromeContext();
  const ref = useRef<T | null>(null);
  const stableId = id ?? `el-${slot}`;
  const unregisterRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled) {
      unregisterRef.current?.();
      unregisterRef.current = null;
      return;
    }

    let ro: ResizeObserver | null = null;
    let raf = 0;
    let cancelled = false;

    const publish = (h: number) => {
      if (cancelled) return;
      unregisterRef.current?.();
      unregisterRef.current = registerChrome({
        id: stableId,
        slot,
        height: Math.max(0, Math.round(h)) || defaultSlotHeight(slot),
      });
    };

    const attach = (): boolean => {
      const el = ref.current;
      if (!el) return false;
      publish(el.getBoundingClientRect().height);
      ro = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        publish(entry.contentRect.height);
      });
      ro.observe(el);
      return true;
    };

    // Ref may not be set on the first effect pass (AnimatePresence / late mount).
    if (!attach()) {
      publish(defaultSlotHeight(slot));
      raf = requestAnimationFrame(() => {
        if (!cancelled) attach();
      });
    }

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      ro?.disconnect();
      unregisterRef.current?.();
      unregisterRef.current = null;
    };
  }, [registerChrome, slot, enabled, stableId]);

  return ref;
}
