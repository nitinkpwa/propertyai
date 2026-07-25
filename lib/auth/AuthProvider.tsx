"use client";

import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { fetchProfile, getDashboardPath } from "@/lib/auth/profile";
import { bootstrapSession, recoverSessionOnWake } from "@/lib/auth/sessionRecovery";
import { clearCompareIds } from "@/lib/buyer/compareStore";
import { logger, APP_VERSION } from "@/lib/stability";
import { supabase } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase";

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  dashboardPath: string;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Last bootstrap status for diagnostics */
  sessionStatus: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function isProtectedPath(pathname: string): boolean {
  return (
    pathname.startsWith("/buyer") ||
    pathname.startsWith("/seller") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/connect/dashboard") ||
    pathname.startsWith("/builder") ||
    pathname.startsWith("/profile")
  );
}

function logAuthDiagnostics(input: {
  reason: string;
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  status: string;
}) {
  if (process.env.NODE_ENV !== "development") return;
  const jwtExp = (() => {
    try {
      const token = input.session?.access_token;
      if (!token) return null;
      const payload = JSON.parse(atob(token.split(".")[1] ?? "")) as { exp?: number };
      return payload.exp ? new Date(payload.exp * 1000).toISOString() : null;
    } catch {
      return null;
    }
  })();

  logger.info("auth", input.reason, {
    status: input.status,
    userId: input.user?.id ?? null,
    role: input.profile?.role ?? null,
    route: typeof window !== "undefined" ? window.location.pathname : null,
    jwtExpiresAt: jwtExp,
    sessionExpiresAt: input.session?.expires_at
      ? new Date(input.session.expires_at * 1000).toISOString()
      : null,
    appVersion: APP_VERSION,
    storedVersion:
      typeof window !== "undefined"
        ? localStorage.getItem("areaiq_app_version")
        : null,
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionStatus, setSessionStatus] = useState("booting");
  const router = useRouter();

  const clearAuthState = useCallback(() => {
    setSession(null);
    setUser(null);
    setProfile(null);
  }, []);

  const forceCleanLogout = useCallback(
    async (reason: string) => {
      logger.error("auth", `Clean logout: ${reason}`);
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        /* ignore */
      }
      clearAuthState();
      setSessionStatus("cleared");
      const pathname = typeof window !== "undefined" ? window.location.pathname : "/";
      if (isProtectedPath(pathname)) {
        window.location.assign(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }
      router.refresh();
    },
    [clearAuthState, router],
  );

  const loadProfile = useCallback(async (nextUser: User | null) => {
    if (!nextUser) {
      setProfile(null);
      return;
    }

    try {
      const nextProfile = await fetchProfile(nextUser.id);
      setProfile(nextProfile);
    } catch (err) {
      logger.warn("auth", "Profile load failed", err);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const result = await bootstrapSession();
        if (!mounted) return;

        setUser(result.user);
        setSession(result.session);
        setProfile(result.profile);
        setSessionStatus(result.status);
        setLoading(false);

        logAuthDiagnostics({
          reason: "initialize",
          user: result.user,
          session: result.session,
          profile: result.profile,
          status: result.status,
        });

        // Cleared on a protected route → soft redirect (never crash)
        if (
          result.status === "cleared" &&
          typeof window !== "undefined" &&
          isProtectedPath(window.location.pathname)
        ) {
          window.location.assign(
            `/login?redirect=${encodeURIComponent(window.location.pathname)}`,
          );
        }
      } catch (err) {
        logger.error("auth", "Initialize failed — continuing anonymous", err);
        if (!mounted) return;
        clearAuthState();
        setSessionStatus("error");
        setLoading(false);
      }
    };

    void initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!mounted) return;

      try {
        if (event === "TOKEN_REFRESHED" && !nextSession) {
          // One recovery attempt before logout
          const wake = await recoverSessionOnWake();
          if (!wake.ok || wake.fatal) {
            await forceCleanLogout("TOKEN_REFRESHED with empty session");
            return;
          }
          setSession(wake.session);
          setUser(wake.session?.user ?? null);
          await loadProfile(wake.session?.user ?? null);
          setSessionStatus("recovered");
          setLoading(false);
          return;
        }

        if (event === "SIGNED_OUT") {
          clearAuthState();
          setSessionStatus("signed_out");
          setLoading(false);
          router.refresh();
          return;
        }

        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        await loadProfile(nextSession?.user ?? null);
        setSessionStatus(event.toLowerCase());
        setLoading(false);

        logAuthDiagnostics({
          reason: `onAuthStateChange:${event}`,
          user: nextSession?.user ?? null,
          session: nextSession,
          profile: null,
          status: event,
        });

        if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED") {
          router.refresh();
        }
      } catch (err) {
        logger.error("auth", `onAuthStateChange handler failed (${event})`, err);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile, forceCleanLogout, clearAuthState, router]);

  const refreshProfile = useCallback(async () => {
    await loadProfile(user);
  }, [loadProfile, user]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      logger.error("auth", "Sign out failed", error.message);
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        /* ignore */
      }
    }
    clearCompareIds();
    clearAuthState();
    setSessionStatus("signed_out");
    router.refresh();
  }, [clearAuthState, router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      session,
      loading,
      dashboardPath: getDashboardPath(profile?.role),
      refreshProfile,
      signOut,
      sessionStatus,
    }),
    [user, profile, session, loading, refreshProfile, signOut, sessionStatus],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

export function useAuthOptional() {
  return useContext(AuthContext);
}
