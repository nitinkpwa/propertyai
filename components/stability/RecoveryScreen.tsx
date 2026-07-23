"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { APP_VERSION, logger } from "@/lib/stability";
import { isStaleAssetError, recoverFromStaleAssets } from "@/lib/stability/chunkRecovery";
import {
  clearAreaIqLocalStorage,
  clearAreaIqSessionStorage,
  unregisterServiceWorkers,
} from "@/lib/stability/storage";
import ErrorState from "@/components/ui/ErrorState";

interface RecoveryScreenProps {
  error?: Error & { digest?: string };
  reset?: () => void;
  title?: string;
  description?: string;
}

/**
 * Premium recovery UI — Reload / Recover state / Home / Retry.
 */
export default function RecoveryScreen({
  error,
  reset,
  title = "Something went wrong",
  description = "AreaIQ hit an unexpected error. You can reload this page or head home — your data is safe.",
}: RecoveryScreenProps) {
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (error) {
      logger.error("recovery", error.message, { digest: error.digest, stack: error.stack });
      if (isStaleAssetError(error)) {
        void recoverFromStaleAssets(`recovery-screen:${error.message}`);
      }
    }
  }, [error]);

  const reload = () => {
    if (typeof window !== "undefined") window.location.reload();
  };

  const recoverClientState = async () => {
    if (typeof window === "undefined") return;
    setRecovering(true);
    try {
      clearAreaIqLocalStorage({ keepAuth: true });
      clearAreaIqSessionStorage();
      await unregisterServiceWorkers();
      try {
        localStorage.setItem("areaiq_app_version", APP_VERSION);
      } catch {
        /* ignore */
      }
      window.location.href = "/";
    } catch {
      window.location.reload();
    }
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
        <button
          type="button"
          disabled={recovering}
          onClick={() => void recoverClientState()}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:opacity-60"
        >
          {recovering ? "Recovering…" : "Fix stale browser state"}
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
