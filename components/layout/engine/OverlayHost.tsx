"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const HOST_ID = "areaiq-overlay-host";

/** Ensures a single portal mount exists for overlays */
export function OverlayHost({ children }: { children?: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let host = document.getElementById(HOST_ID);
    if (!host) {
      host = document.createElement("div");
      host.id = HOST_ID;
      host.setAttribute("data-layout", "overlay-host");
      document.body.appendChild(host);
    }
    setReady(true);
  }, []);

  if (!ready || !children) return null;
  const host = document.getElementById(HOST_ID);
  if (!host) return null;
  return createPortal(children, host);
}

export function getOverlayHostElement(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.getElementById(HOST_ID);
}

/** Portal helper for overlay surfaces */
export function OverlayPortal({ children }: { children: ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let el = document.getElementById(HOST_ID);
    if (!el) {
      el = document.createElement("div");
      el.id = HOST_ID;
      el.setAttribute("data-layout", "overlay-host");
      document.body.appendChild(el);
    }
    setHost(el);
  }, []);

  if (!host) return null;
  return createPortal(children, host);
}
