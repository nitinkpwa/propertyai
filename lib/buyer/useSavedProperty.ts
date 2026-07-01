"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useProgressiveProfileOptional } from "@/components/buyer/ProgressiveProfileProvider";
import {
  fetchSavedPropertyIds,
  isPropertySaved,
  toggleSavedProperty,
} from "@/lib/buyer/queries";

function loginRedirectPath(): string {
  if (typeof window === "undefined") return "/login";
  return `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
}

export function useSavedPropertyToggle() {
  const router = useRouter();
  const { user } = useAuth();
  const profilePrompt = useProgressiveProfileOptional();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      setSavedIds(new Set());
      return;
    }

    fetchSavedPropertyIds(user.id).then((ids) => setSavedIds(new Set(ids)));
  }, [user]);

  const isSaved = useCallback((propertyId: string) => savedIds.has(propertyId), [savedIds]);

  const handleFavoriteToggle = useCallback(
    async (propertyId: string, favorited: boolean) => {
      if (!user) {
        router.push(loginRedirectPath());
        return;
      }

      setSavedIds((prev) => {
        const next = new Set(prev);
        if (favorited) next.add(propertyId);
        else next.delete(propertyId);
        return next;
      });

      const ok = await toggleSavedProperty(user.id, propertyId, favorited);
      if (!ok) {
        setSavedIds((prev) => {
          const next = new Set(prev);
          if (favorited) next.delete(propertyId);
          else next.add(propertyId);
          return next;
        });
      } else if (favorited) {
        void profilePrompt?.promptIfNeeded("save_property");
      }
    },
    [user, router, profilePrompt],
  );

  return { isSaved, handleFavoriteToggle, user };
}

export function useSavedProperty(propertyId: string) {
  const router = useRouter();
  const { user } = useAuth();
  const profilePrompt = useProgressiveProfileOptional();
  const [saved, setSaved] = useState(false);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      setSaved(false);
      setChecking(false);
      return;
    }

    setChecking(true);
    isPropertySaved(user.id, propertyId)
      .then(setSaved)
      .finally(() => setChecking(false));
  }, [user, propertyId]);

  const toggle = useCallback(async () => {
    if (!user) {
      router.push(loginRedirectPath());
      return;
    }

    const next = !saved;
    setSaving(true);
    setSaved(next);

    const ok = await toggleSavedProperty(user.id, propertyId, next);
    if (!ok) {
      setSaved(!next);
    } else if (next) {
      void profilePrompt?.promptIfNeeded("save_property");
    }

    setSaving(false);
  }, [user, propertyId, saved, router, profilePrompt]);

  return { saved, toggle, checking, saving, isAuthenticated: !!user };
}
