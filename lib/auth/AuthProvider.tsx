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
import { fetchProfile, getDashboardPath } from "@/lib/auth/profile";
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (nextUser: User | null) => {
    if (!nextUser) {
      setProfile(null);
      return;
    }

    const nextProfile = await fetchProfile(nextUser.id);
    setProfile(nextProfile);
  }, []);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      const {
        data: { user: initialUser },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error("Failed to restore session:", error.message);
      }

      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setUser(initialUser ?? null);
      setSession(initialSession);
      await loadProfile(initialUser ?? null);
      setLoading(false);
    };

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      await loadProfile(nextSession?.user ?? null);
      setLoading(false);

      if (event === "SIGNED_OUT") {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    await loadProfile(user);
  }, [loadProfile, user]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Sign out failed:", error.message);
    }
    setSession(null);
    setUser(null);
    setProfile(null);
  }, []);

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
