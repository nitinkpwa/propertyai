"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { recoverSessionOnWake } from "@/lib/auth/sessionRecovery";
import {
  runVersionGuard,
  logger,
  APP_VERSION,
} from "@/lib/stability";
import { isStaleAssetError, recoverFromStaleAssets } from "@/lib/stability/chunkRecovery";

const WAKE_THRESHOLD_MS = 30 * 60_000; // 30 minutes backgrounded

/**
 * Production stability shell:
 * - Deploy version mismatch → purge AreaIQ caches + reload once
 * - Stale chunk / dynamic import failures → recover once
 * - Offline / online banner
 * - Session refresh after long sleep
 * - Global crash / unhandledrejection logging
 */
export default function StabilityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const result = await runVersionGuard();
        if (cancelled) return;
        if (result.status === "upgraded" && result.reloading) {
          // Hard reload in progress — don't mount children mid-wipe
          return;
        }
      } catch (err) {
        logger.error("version", "Version guard failed — continuing", err);
      }
      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Network banner
  useEffect(() => {
    if (!ready) return;

    const sync = () => setOffline(typeof navigator !== "undefined" && !navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, [ready]);

  // Session recovery after long background / wake
  useEffect(() => {
    if (!ready) return;

    let lastHiddenAt = 0;

    const onVisibility = async () => {
      if (document.visibilityState === "hidden") {
        lastHiddenAt = Date.now();
        return;
      }

      const slept = lastHiddenAt > 0 ? Date.now() - lastHiddenAt : 0;
      if (slept < WAKE_THRESHOLD_MS) return;

      logger.info("session", `Tab woke after ${Math.round(slept / 60_000)}m — refreshing session`);

      const result = await recoverSessionOnWake();
      if (result.fatal) {
        const protectedPath =
          pathname.startsWith("/buyer") ||
          pathname.startsWith("/seller") ||
          pathname.startsWith("/admin") ||
          pathname.startsWith("/connect/dashboard") ||
          pathname.startsWith("/builder") ||
          pathname.startsWith("/profile");
        if (protectedPath) {
          router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        }
        return;
      }
      if (result.ok) {
        router.refresh();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [ready, pathname, router]);

  // Global error / rejection logging + stale-asset recovery
  useEffect(() => {
    if (!ready) return;

    if (process.env.NODE_ENV === "development") {
      logger.info("stability", "Ready", {
        appVersion: APP_VERSION,
        route: pathname,
        online: navigator.onLine,
      });
    }

    const onError = (event: ErrorEvent) => {
      logger.error("runtime", event.message || "Unhandled error", {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });

      if (isStaleAssetError(event.error ?? event.message)) {
        event.preventDefault();
        void recoverFromStaleAssets(event.message || "window.error");
      }
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "Unhandled promise rejection";
      logger.error("runtime", message, reason);

      if (isStaleAssetError(reason ?? message)) {
        event.preventDefault();
        void recoverFromStaleAssets(message);
      }
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [ready, pathname]);

  const retryOnline = useCallback(() => {
    if (navigator.onLine) {
      setOffline(false);
      router.refresh();
    }
  }, [router]);

  if (!ready) {
    // Avoid flashing stale UI while version guard runs (usually <16ms)
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white" aria-busy="true">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
      </div>
    );
  }

  return (
    <>
      {offline ? (
        <div
          role="status"
          className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-3 bg-neutral-900 px-4 py-2.5 text-center text-sm text-white shadow-lg"
        >
          <span>You&apos;re offline. Changes will sync when you reconnect.</span>
          <button
            type="button"
            onClick={retryOnline}
            className="rounded-lg bg-white/15 px-3 py-1 text-xs font-semibold hover:bg-white/25"
          >
            Retry
          </button>
        </div>
      ) : null}
      {children}
    </>
  );
}
