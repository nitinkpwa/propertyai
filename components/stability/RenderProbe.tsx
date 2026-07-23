"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { traceRender } from "@/lib/stability/crashReport";

/** Logs a render breadcrumb every time this wrapper paints (dev + sessionStorage). */
export default function RenderProbe({
  name,
  children,
}: {
  name: string;
  children: ReactNode;
}) {
  traceRender(name);
  useEffect(() => {
    traceRender(`${name}:mounted`);
  }, [name]);
  return <>{children}</>;
}
