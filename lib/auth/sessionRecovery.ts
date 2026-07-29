import type { Session, User } from "@supabase/supabase-js";
import { isFatalAuthError, logger } from "@/lib/stability";
import { supabase } from "@/lib/supabase/client";
import { fetchProfile } from "@/lib/auth/profile";
import type { Profile } from "@/lib/supabase";

export interface SessionBootstrapResult {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  status: "ok" | "anonymous" | "recovered" | "cleared";
  reason?: string;
  jwtExpiresAt?: number | null;
  refreshExpiresAt?: number | null;
}

function sessionMeta(session: Session | null) {
  const access = session?.access_token;
  let jwtExpiresAt: number | null = null;
  if (access) {
    try {
      const payload = JSON.parse(atob(access.split(".")[1] ?? "")) as { exp?: number };
      jwtExpiresAt = typeof payload.exp === "number" ? payload.exp : null;
    } catch {
      jwtExpiresAt = null;
    }
  }
  return {
    jwtExpiresAt,
    refreshExpiresAt: session?.expires_at ?? null,
  };
}

function isMissingSessionError(error: { name?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.name === "AuthSessionMissingError" ||
    error.message === "Auth session missing!" ||
    (error.message?.toLowerCase().includes("auth session missing") ?? false)
  );
}

/**
 * Bootstrap session with one automatic refresh/retry.
 * Never throws. On fatal auth: clear local session and return anonymous.
 */
export async function bootstrapSession(): Promise<SessionBootstrapResult> {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  try {
    const {
      data: { session: initialSession },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError && isFatalAuthError(sessionError.message)) {
      return clearBrokenSession(sessionError.message);
    }

    if (!initialSession) {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError && !isMissingSessionError(userError)) {
        if (isFatalAuthError(userError.message)) {
          return clearBrokenSession(userError.message);
        }
        logger.warn("session", "getUser soft failure", userError.message);
      }

      if (!user) {
        return { user: null, session: null, profile: null, status: "anonymous" };
      }
    }

    // Validate JWT with server (getUser) — cookies may look valid but be revoked
    let {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError && isFatalAuthError(userError.message)) {
      // Retry once via refresh
      logger.warn("session", "Fatal auth on getUser — attempting refresh", userError.message);
      const refreshed = await tryRefresh();
      if (!refreshed.ok) {
        return clearBrokenSession(userError.message);
      }
      user = refreshed.user;
      const profile = user ? await safeProfile(user.id) : null;
      const meta = sessionMeta(refreshed.session);
      logDevBootstrap("recovered", user, refreshed.session, profile, meta);
      console.warn("[perf] auth.bootstrapSession", {
        durationMs: Math.round(((typeof performance !== "undefined" ? performance.now() : Date.now()) - t0) * 100) / 100,
        status: "recovered",
        getUserCalls: "multiple",
      });
      return {
        user,
        session: refreshed.session,
        profile,
        status: "recovered",
        reason: userError.message,
        ...meta,
      };
    }

    if (userError && !isMissingSessionError(userError)) {
      logger.warn("session", "getUser soft failure", userError.message);
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const profile = user ? await safeProfile(user.id) : null;
    const meta = sessionMeta(session);
    logDevBootstrap("ok", user, session, profile, meta);

    console.warn("[perf] auth.bootstrapSession", {
      durationMs: Math.round(((typeof performance !== "undefined" ? performance.now() : Date.now()) - t0) * 100) / 100,
      status: user ? "ok" : "anonymous",
      repeatedGetUser: true,
      repeatedGetSession: true,
      fetchProfile: Boolean(user),
    });

    return {
      user: user ?? null,
      session,
      profile,
      status: user ? "ok" : "anonymous",
      ...meta,
    };
  } catch (err) {
    logger.error("session", "bootstrapSession threw — recovering", err);
    return clearBrokenSession(err instanceof Error ? err.message : "bootstrap_exception");
  }
}

async function tryRefresh(): Promise<
  { ok: true; user: User | null; session: Session | null } | { ok: false }
> {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) {
      logger.warn("session", "refreshSession failed", error?.message);
      return { ok: false };
    }
    return { ok: true, user: data.user, session: data.session };
  } catch (err) {
    logger.warn("session", "refreshSession threw", err);
    return { ok: false };
  }
}

async function clearBrokenSession(reason: string): Promise<SessionBootstrapResult> {
  logger.error("session", `Clearing broken session: ${reason}`);
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    /* ignore */
  }
  return {
    user: null,
    session: null,
    profile: null,
    status: "cleared",
    reason,
    jwtExpiresAt: null,
    refreshExpiresAt: null,
  };
}

async function safeProfile(userId: string): Promise<Profile | null> {
  try {
    return await fetchProfile(userId);
  } catch (err) {
    logger.warn("session", "Profile load failed", err);
    return null;
  }
}

function logDevBootstrap(
  status: string,
  user: User | null | undefined,
  session: Session | null,
  profile: Profile | null,
  meta: { jwtExpiresAt: number | null; refreshExpiresAt: number | null },
) {
  if (process.env.NODE_ENV !== "development") return;
  logger.info("session", "Bootstrap", {
    status,
    userId: user?.id ?? null,
    role: profile?.role ?? null,
    route: typeof window !== "undefined" ? window.location.pathname : null,
    jwtExpiresAt: meta.jwtExpiresAt
      ? new Date(meta.jwtExpiresAt * 1000).toISOString()
      : null,
    sessionExpiresAt: meta.refreshExpiresAt
      ? new Date(meta.refreshExpiresAt * 1000).toISOString()
      : null,
    appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? null,
  });
}

/** Soft wake recovery — refresh if needed, never throw. */
export async function recoverSessionOnWake(): Promise<{
  ok: boolean;
  session: Session | null;
  fatal: boolean;
  reason?: string;
}> {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      if (isFatalAuthError(error.message)) {
        try {
          await supabase.auth.signOut({ scope: "local" });
        } catch {
          /* ignore */
        }
        return { ok: false, session: null, fatal: true, reason: error.message };
      }
      return { ok: false, session: null, fatal: false, reason: error.message };
    }
    return { ok: Boolean(data.session), session: data.session, fatal: false };
  } catch (err) {
    return {
      ok: false,
      session: null,
      fatal: false,
      reason: err instanceof Error ? err.message : "wake_recovery_failed",
    };
  }
}
