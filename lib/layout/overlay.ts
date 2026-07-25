"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import type { OverlayLayer } from "./types";
import { Z_INDEX, zClass, zStyle } from "./zIndex";

export { Z_INDEX, zClass, zStyle };
export type { OverlayLayer };

export type OverlayRegistration = {
  id: string;
  layer: OverlayLayer;
  onClose?: () => void;
};

type OverlayListener = (stack: OverlayRegistration[]) => void;

let stack: OverlayRegistration[] = [];
let scrollLockCount = 0;
let previousOverflow = "";
const listeners = new Set<OverlayListener>();

function notify() {
  const snapshot = [...stack];
  listeners.forEach((l) => l(snapshot));
}

function lockScroll() {
  if (typeof document === "undefined") return;
  if (scrollLockCount === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  scrollLockCount += 1;
}

function unlockScroll() {
  if (typeof document === "undefined") return;
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) {
    document.body.style.overflow = previousOverflow;
  }
}

export function getOverlayStack(): OverlayRegistration[] {
  return [...stack];
}

export function subscribeOverlays(listener: OverlayListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function openOverlay(reg: OverlayRegistration): () => void {
  stack = [...stack.filter((r) => r.id !== reg.id), reg];
  lockScroll();
  notify();
  return () => closeOverlay(reg.id);
}

export function closeOverlay(id: string): void {
  const exists = stack.some((r) => r.id === id);
  if (!exists) return;
  stack = stack.filter((r) => r.id !== id);
  unlockScroll();
  notify();
}

export function closeTopOverlay(): boolean {
  const top = stack[stack.length - 1];
  if (!top) return false;
  top.onClose?.();
  closeOverlay(top.id);
  return true;
}

/**
 * Register an overlay while `open` is true.
 * Handles scroll lock + stack membership; caller still renders the UI.
 */
export function useOverlay(
  layer: OverlayLayer,
  open: boolean,
  onClose?: () => void,
): { zIndex: number; zClassName: string; overlayId: string } {
  const reactId = useId();
  const overlayId = `overlay-${layer}-${reactId}`;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    return openOverlay({
      id: overlayId,
      layer,
      onClose: () => onCloseRef.current?.(),
    });
  }, [open, overlayId, layer]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const top = stack[stack.length - 1];
      if (top?.id === overlayId) {
        e.stopPropagation();
        onCloseRef.current?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, overlayId]);

  return {
    zIndex: Z_INDEX[layer],
    zClassName: layer === "base" ? "" : zClass[layer],
    overlayId,
  };
}

/** Focus trap within a container while active */
export function useFocusTrap(
  active: boolean,
  containerRef: React.RefObject<HTMLElement | null>,
): void {
  const previousFocus = useRef<HTMLElement | null>(null);

  const focusFirst = useCallback(() => {
    const root = containerRef.current;
    if (!root) return;
    const el = root.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    el?.focus();
  }, [containerRef]);

  useEffect(() => {
    if (!active) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    requestAnimationFrame(focusFirst);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const root = containerRef.current;
      if (!root) return;
      const focusables = [
        ...root.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocus.current?.focus?.();
    };
  }, [active, containerRef, focusFirst]);
}
