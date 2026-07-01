"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  getProfileCompleteness,
  shouldPromptProfile,
} from "@/lib/buyer/profileCompleteness";
import ProfileCompletionModal from "./ProfileCompletionModal";

type ProfileAction =
  | "save_property"
  | "ai_chat"
  | "contact_seller"
  | "site_visit"
  | "inquiry"
  | "default";

interface ProgressiveProfileContextValue {
  completeness: ReturnType<typeof getProfileCompleteness>;
  promptIfNeeded: (action?: ProfileAction) => Promise<boolean>;
  openModal: (action?: ProfileAction) => void;
  refreshProfile: () => Promise<void>;
}

const ProgressiveProfileContext = createContext<ProgressiveProfileContextValue | null>(null);

export function ProgressiveProfileProvider({ children }: { children: ReactNode }) {
  const { profile, refreshProfile: authRefresh } = useAuth();
  const isBuyer = !profile?.role || profile.role === "buyer";
  const [open, setOpen] = useState(false);
  const [resolvePromise, setResolvePromise] = useState<((v: boolean) => void) | null>(null);

  const completeness = useMemo(() => getProfileCompleteness(profile), [profile]);

  const openModal = useCallback(
    (_action: ProfileAction = "default") => {
      if (completeness.isComplete) return;
      setOpen(true);
    },
    [completeness.isComplete],
  );

  const promptIfNeeded = useCallback(
    (action: ProfileAction = "default") => {
      if (!isBuyer) return Promise.resolve(true);
      if (!shouldPromptProfile(profile, action)) {
        return Promise.resolve(true);
      }

      return new Promise<boolean>((resolve) => {
        setOpen(true);
        setResolvePromise(() => resolve);
      });
    },
    [profile, isBuyer],
  );

  const handleClose = useCallback(
    (saved: boolean) => {
      setOpen(false);
      resolvePromise?.(saved);
      setResolvePromise(null);
    },
    [resolvePromise],
  );

  const refreshProfile = useCallback(async () => {
    await authRefresh();
  }, [authRefresh]);

  return (
    <ProgressiveProfileContext.Provider
      value={{ completeness, promptIfNeeded, openModal, refreshProfile }}
    >
      {children}
      {isBuyer && open ? (
        <ProfileCompletionModal
          completeness={completeness}
          onClose={handleClose}
          onSaved={refreshProfile}
        />
      ) : null}
    </ProgressiveProfileContext.Provider>
  );
}

export function useProgressiveProfile() {
  const ctx = useContext(ProgressiveProfileContext);
  if (!ctx) {
    throw new Error("useProgressiveProfile must be used within ProgressiveProfileProvider");
  }
  return ctx;
}

export function useProgressiveProfileOptional() {
  return useContext(ProgressiveProfileContext);
}
