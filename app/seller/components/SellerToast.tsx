"use client";

import { useEffect } from "react";

export type SellerToastState = {
  type: "success" | "error";
  message: string;
} | null;

export default function SellerToast({
  toast,
  onDismiss,
}: {
  toast: SellerToastState;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(onDismiss, 4200);
    return () => window.clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div
      role="status"
      className="pointer-events-none fixed bottom-chrome right-4 z-layout-toast max-w-sm animate-[fadeIn_0.2s_ease-out] lg:bottom-6 lg:right-6"
    >
      <div
        className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${
          toast.type === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-red-200 bg-red-50 text-red-800"
        }`}
      >
        {toast.message}
      </div>
    </div>
  );
}
