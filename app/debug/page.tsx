"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import { isAdminRole } from "@/lib/auth/admin";
import { APP_VERSION, listStorageKeys, logger } from "@/lib/stability";
import { readLastCrash, type CrashReport } from "@/lib/stability/crashReport";
import {
  clearAreaIqLocalStorage,
  clearAreaIqSessionStorage,
  unregisterServiceWorkers,
} from "@/lib/stability/storage";
import { supabase } from "@/lib/supabase/client";
import { PageSkeleton } from "@/components/ui/Skeleton";

interface DebugSnapshot {
  appVersion: string;
  storedVersion: string | null;
  userId: string | null;
  email: string | null;
  role: string | null;
  sessionStatus: string;
  sessionValid: boolean;
  jwtExpiresAt: string | null;
  refreshExpiresAt: string | null;
  route: string;
  online: boolean;
  userAgent: string;
  storage: { local: string[]; session: string[]; cookieNames: string[] };
  serviceWorkers: number;
  cacheNames: string[];
  supabaseUrlHost: string | null;
  lastError: string | null;
  apiHealth: "ok" | "fail" | "checking";
}

function decodeJwtExp(token?: string | null): string | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1] ?? "")) as { exp?: number };
    return payload.exp ? new Date(payload.exp * 1000).toISOString() : null;
  } catch {
    return null;
  }
}

export default function DebugPage() {
  const { user, profile, session, loading, sessionStatus } = useAuth();
  const [snapshot, setSnapshot] = useState<DebugSnapshot | null>(null);
  const [lastCrash, setLastCrash] = useState<CrashReport | null>(null);
  const [busy, setBusy] = useState(false);

  const isAdmin = isAdminRole(profile?.role);

  const collect = useCallback(async () => {
    const storage = listStorageKeys();
    let serviceWorkers = 0;
    let cacheNames: string[] = [];
    try {
      if ("serviceWorker" in navigator) {
        serviceWorkers = (await navigator.serviceWorker.getRegistrations()).length;
      }
    } catch {
      /* ignore */
    }
    try {
      if ("caches" in window) {
        cacheNames = await caches.keys();
      }
    } catch {
      /* ignore */
    }

    let apiHealth: DebugSnapshot["apiHealth"] = "checking";
    try {
      const { error } = await supabase.from("profiles").select("id").limit(1);
      apiHealth = error ? "fail" : "ok";
    } catch {
      apiHealth = "fail";
    }

    let supabaseUrlHost: string | null = null;
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      supabaseUrlHost = url ? new URL(url).host : null;
    } catch {
      supabaseUrlHost = null;
    }

    const next: DebugSnapshot = {
      appVersion: APP_VERSION,
      storedVersion: localStorage.getItem("areaiq_app_version"),
      userId: user?.id ?? null,
      email: user?.email ?? null,
      role: profile?.role ?? null,
      sessionStatus,
      sessionValid: Boolean(session?.access_token && user),
      jwtExpiresAt: decodeJwtExp(session?.access_token),
      refreshExpiresAt: session?.expires_at
        ? new Date(session.expires_at * 1000).toISOString()
        : null,
      route: window.location.pathname,
      online: navigator.onLine,
      userAgent: navigator.userAgent,
      storage,
      serviceWorkers,
      cacheNames,
      supabaseUrlHost,
      lastError: null,
      apiHealth,
    };

    setSnapshot(next);
    setLastCrash(readLastCrash());
    logger.info("debug", "Snapshot collected", {
      appVersion: next.appVersion,
      role: next.role,
      sessionValid: next.sessionValid,
    });
  }, [user, profile, session, sessionStatus]);

  useEffect(() => {
    if (!loading && isAdmin) {
      void collect();
    }
  }, [loading, isAdmin, collect]);

  const recover = async () => {
    setBusy(true);
    try {
      clearAreaIqLocalStorage({ keepAuth: true });
      clearAreaIqSessionStorage();
      await unregisterServiceWorkers();
      localStorage.setItem("areaiq_app_version", APP_VERSION);
      window.location.reload();
    } catch {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 pt-chrome">
        <PageSkeleton rows={6} />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
        <h1 className="text-xl font-bold text-heading-primary">Debug console</h1>
        <p className="mt-2 text-sm text-muted">Admin access required.</p>
        <Link href="/" className="mt-6 text-sm font-semibold text-brand-dark">
          Go home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 pt-chrome">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-dark">
            AreaIQ internals
          </p>
          <h1 className="mt-1 text-2xl font-bold text-heading-primary">Debug</h1>
          <p className="mt-1 text-sm text-muted">Session, storage, and client health</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void collect()}
            className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold"
          >
            Refresh
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void recover()}
            className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Recovering…" : "Recover client state"}
          </button>
        </div>
      </div>

      {!snapshot ? (
        <PageSkeleton rows={4} />
      ) : (
        <div className="space-y-4">
      <Section title="Last crash">
            {lastCrash ? (
              <>
                <Row label="Component" value={lastCrash.component} />
                <Row label="Message" value={lastCrash.message} />
                <Row label="When" value={lastCrash.at} />
                <Row label="Route" value={lastCrash.route ?? "—"} />
                <CodeBlock lines={lastCrash.renderTrace ?? []} />
              </>
            ) : (
              <p className="py-3 text-sm text-muted">No crash recorded this session</p>
            )}
          </Section>

          <Section title="Identity">
            <Row label="User" value={snapshot.userId ?? "—"} />
            <Row label="Email" value={snapshot.email ?? "—"} />
            <Row label="Role" value={snapshot.role ?? "—"} />
          </Section>

          <Section title="Session">
            <Row label="Status" value={snapshot.sessionStatus} />
            <Row label="Valid" value={snapshot.sessionValid ? "yes" : "no"} />
            <Row label="JWT expiry" value={snapshot.jwtExpiresAt ?? "—"} />
            <Row label="Session expiry" value={snapshot.refreshExpiresAt ?? "—"} />
          </Section>

          <Section title="Versions">
            <Row label="App version" value={snapshot.appVersion} />
            <Row label="Stored version" value={snapshot.storedVersion ?? "—"} />
            <Row
              label="Match"
              value={
                snapshot.storedVersion === snapshot.appVersion ? "yes" : "MISMATCH"
              }
            />
          </Section>

          <Section title="Runtime">
            <Row label="Route" value={snapshot.route} />
            <Row label="Network" value={snapshot.online ? "online" : "offline"} />
            <Row label="API / Supabase" value={snapshot.apiHealth} />
            <Row label="Supabase host" value={snapshot.supabaseUrlHost ?? "—"} />
            <Row label="Service workers" value={String(snapshot.serviceWorkers)} />
            <Row
              label="Cache API"
              value={snapshot.cacheNames.length ? snapshot.cacheNames.join(", ") : "none"}
            />
            <Row label="User agent" value={snapshot.userAgent} />
          </Section>

          <Section title="localStorage keys">
            <CodeBlock lines={snapshot.storage.local} />
          </Section>

          <Section title="sessionStorage keys">
            <CodeBlock lines={snapshot.storage.session} />
          </Section>

          <Section title="Cookie names">
            <CodeBlock lines={snapshot.storage.cookieNames} />
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <h2 className="border-b border-neutral-100 bg-neutral-50 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-label">
        {title}
      </h2>
      <div className="divide-y divide-neutral-100 px-4">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <span className="shrink-0 text-xs font-medium text-muted">{label}</span>
      <span className="break-all text-sm font-medium text-heading-primary sm:text-right">
        {value}
      </span>
    </div>
  );
}

function CodeBlock({ lines }: { lines: string[] }) {
  if (lines.length === 0) {
    return <p className="py-3 text-sm text-muted">Empty</p>;
  }
  return (
    <pre className="overflow-x-auto py-3 font-mono text-[11px] leading-relaxed text-body">
      {lines.join("\n")}
    </pre>
  );
}
