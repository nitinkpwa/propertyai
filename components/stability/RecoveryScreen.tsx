"use client";

import Link from "next/link";
import { useEffect } from "react";
import { logger } from "@/lib/stability";
import ErrorState from "@/components/ui/ErrorState";

interface RecoveryScreenProps {
  error?: Error & { digest?: string };
  reset?: () => void;
  title?: string;
  description?: string;
}

/**
 * Premium recovery UI — Reload / Home / Retry.
 */
export default function RecoveryScreen({
  error,
  reset,
  title = "Something went wrong",
  description = "AreaIQ hit an unexpected error. You can reload this page or head home — your data is safe.",
}: RecoveryScreenProps) {
  useEffect(() => {
    if (error) {
      logger.error("recovery", error.message, { digest: error.digest, stack: error.stack });
    }
  }, [error]);

  const reload = () => {
    if (typeof window !== "undefined") window.location.reload();
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-neutral-50 px-4 py-12">
      <ErrorState title={title} description={description} onRetry={reset} />
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reload}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-neutral-200 bg-white px-5 text-sm font-semibold text-body transition hover:bg-neutral-50"
        >
          Reload page
        </button>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold text-brand-dark transition hover:bg-brand-muted"
        >
          Go Home
        </Link>
      </div>
      {error?.digest ? (
        <p className="mt-6 text-[11px] text-muted">Ref: {error.digest}</p>
      ) : null}
    </div>
  );
}
