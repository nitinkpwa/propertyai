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
import { isFatalAuthError, logger } from "@/lib/stability";
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
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function isMissingSessionError(error: { name?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.name === "AuthSessionMissingError" ||
    error.message === "Auth session missing!" ||
    (error.message?.toLowerCase().includes("auth session missing") ?? false)
  );
}

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
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
      const {
        data: { user: initialUser },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        if (isFatalAuthError(error.message)) {
          if (mounted) await forceCleanLogout(error.message);
          return;
        }
        if (!isMissingSessionError(error)) {
          logger.error("auth", "Failed to restore session", error.message);
        }
      }

      const {
        data: { session: initialSession },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError && isFatalAuthError(sessionError.message)) {
        if (mounted) await forceCleanLogout(sessionError.message);
        return;
      }

      if (!mounted) return;

      setUser(initialUser ?? null);
      setSession(initialSession);
      await loadProfile(initialUser ?? null);
      setLoading(false);
    };

    void initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!mounted) return;

      if (event === "TOKEN_REFRESHED" && !nextSession) {
        await forceCleanLogout("TOKEN_REFRESHED with empty session");
        return;
      }

      if (event === "SIGNED_OUT") {
        clearAuthState();
        setLoading(false);
        router.refresh();
        return;
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      await loadProfile(nextSession?.user ?? null);
      setLoading(false);

      if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED") {
        router.refresh();
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
    clearAuthState();
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
    }),
    [user, profile, session, loading, refreshProfile, signOut],
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
