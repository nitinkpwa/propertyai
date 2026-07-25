"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { buildLoginUrlWithIntent, clearPendingAuthIntent } from "@/lib/auth/pendingIntent";
import { useProgressiveProfileOptional } from "@/components/buyer/ProgressiveProfileProvider";
import {
  fetchSavedPropertyIds,
  isPropertySaved,
  toggleSavedProperty,
} from "@/lib/buyer/queries";
import { invalidateBuyerNotifications } from "@/lib/buyer/notifications";

export const SAVED_CHANGED_EVENT = "areaiq:saved-changed";

function emitSavedChanged(ids: string[]) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(SAVED_CHANGED_EVENT, { detail: { ids } }),
  );
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

  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<{ ids: string[] }>).detail;
      if (detail?.ids) setSavedIds(new Set(detail.ids));
    };
    window.addEventListener(SAVED_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(SAVED_CHANGED_EVENT, onChange);
  }, []);

  const isSaved = useCallback((propertyId: string) => savedIds.has(propertyId), [savedIds]);

  const handleFavoriteToggle = useCallback(
    async (propertyId: string, favorited: boolean) => {
      if (!user) {
        router.push(
          buildLoginUrlWithIntent({
            action: "save_property",
            propertyId,
            returnUrl:
              typeof window !== "undefined"
                ? `${window.location.pathname}${window.location.search}`
                : "/",
          }),
        );
        return;
      }

      setSavedIds((prev) => {
        const next = new Set(prev);
        if (favorited) next.add(propertyId);
        else next.delete(propertyId);
        emitSavedChanged([...next]);
        return next;
      });

      const ok = await toggleSavedProperty(user.id, propertyId, favorited);
      if (!ok) {
        setSavedIds((prev) => {
          const next = new Set(prev);
          if (favorited) next.delete(propertyId);
          else next.add(propertyId);
          emitSavedChanged([...next]);
          return next;
        });
      } else if (favorited) {
        clearPendingAuthIntent();
        invalidateBuyerNotifications(user.id);
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

  useEffect(() => {
    const onComplete = (e: Event) => {
      const detail = (e as CustomEvent<{ propertyId: string }>).detail;
      if (detail?.propertyId === propertyId) {
        setSaved(true);
      }
    };
    const onSavedChanged = (e: Event) => {
      const detail = (e as CustomEvent<{ ids: string[] }>).detail;
      if (detail?.ids) setSaved(detail.ids.includes(propertyId));
    };
    window.addEventListener("areaiq:pending-save-complete", onComplete);
    window.addEventListener(SAVED_CHANGED_EVENT, onSavedChanged);
    return () => {
      window.removeEventListener("areaiq:pending-save-complete", onComplete);
      window.removeEventListener(SAVED_CHANGED_EVENT, onSavedChanged);
    };
  }, [propertyId]);

  const toggle = useCallback(async () => {
    if (!user) {
      router.push(
        buildLoginUrlWithIntent({
          action: "save_property",
          propertyId,
          returnUrl:
            typeof window !== "undefined"
              ? `${window.location.pathname}${window.location.search}`
              : `/property/${propertyId}`,
        }),
      );
      return;
    }

    const next = !saved;
    setSaving(true);
    setSaved(next);

    const ok = await toggleSavedProperty(user.id, propertyId, next);
    if (!ok) {
      setSaved(!next);
    } else {
      // Sync other hooks (cards / detail)
      fetchSavedPropertyIds(user.id).then((ids) => emitSavedChanged(ids));
      if (next) {
        clearPendingAuthIntent();
        invalidateBuyerNotifications(user.id);
        void profilePrompt?.promptIfNeeded("save_property");
      }
    }

    setSaving(false);
  }, [user, propertyId, saved, router, profilePrompt]);

  return { saved, toggle, checking, saving, isAuthenticated: !!user };
}
