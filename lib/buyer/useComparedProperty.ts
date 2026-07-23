"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { buildLoginUrlWithIntent, clearPendingAuthIntent } from "@/lib/auth/pendingIntent";
import { useProgressiveProfileOptional } from "@/components/buyer/ProgressiveProfileProvider";
import { useToast } from "@/components/ui/Toast";
import {
  addComparedProperty,
  removeComparedPropertyByPropertyId,
} from "@/lib/buyer/queries";
import {
  MAX_COMPARE_PROPERTIES,
  addCompareId,
  getCompareIds,
  isPropertyCompared,
  removeCompareId,
  subscribeCompare,
  type CompareToggleResult,
} from "@/lib/buyer/compareStore";

function useCompareIdsState() {
  const [ids, setIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setIds(getCompareIds());
    setHydrated(true);
    return subscribeCompare(setIds);
  }, []);

  return { ids, hydrated };
}

export function useComparedPropertyToggle() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const profilePrompt = useProgressiveProfileOptional();
  const { ids, hydrated } = useCompareIdsState();

  const isCompared = useCallback(
    (propertyId: string) => ids.includes(propertyId),
    [ids],
  );

  const handleCompareToggle = useCallback(
    async (propertyId: string, compared: boolean): Promise<boolean> => {
      if (compared) {
        const result = addCompareId(propertyId);
        if (!result.ok) {
          showToast(
            `Compare up to ${MAX_COMPARE_PROPERTIES} properties — remove one first`,
            "info",
          );
          return false;
        }
        if (user) {
          const ok = await addComparedProperty(user.id, propertyId);
          if (!ok) {
            removeCompareId(propertyId);
            showToast("Couldn't add to compare. Please try again.", "error");
            return false;
          }
          clearPendingAuthIntent();
          void profilePrompt?.promptIfNeeded("default");
        }
        return true;
      }

      removeCompareId(propertyId);
      if (user) {
        const ok = await removeComparedPropertyByPropertyId(user.id, propertyId);
        if (!ok) {
          addCompareId(propertyId);
          showToast("Couldn't remove from compare. Please try again.", "error");
          return false;
        }
      }
      return true;
    },
    [user, showToast, profilePrompt],
  );

  return {
    ids,
    count: ids.length,
    hydrated,
    isCompared,
    handleCompareToggle,
    maxCompare: MAX_COMPARE_PROPERTIES,
    user,
  };
}

export function useComparedProperty(propertyId: string) {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const profilePrompt = useProgressiveProfileOptional();
  const { ids, hydrated } = useCompareIdsState();
  const [busy, setBusy] = useState(false);

  const compared = ids.includes(propertyId);

  const toggle = useCallback(async (): Promise<CompareToggleResult> => {
    setBusy(true);
    try {
      if (compared) {
        removeCompareId(propertyId);
        if (user) {
          const ok = await removeComparedPropertyByPropertyId(user.id, propertyId);
          if (!ok) {
            addCompareId(propertyId);
            showToast("Couldn't remove from compare. Please try again.", "error");
            return { ok: false, reason: "max", ids: getCompareIds() };
          }
        }
        return { ok: true, compared: false, ids: getCompareIds() };
      }

      const result = addCompareId(propertyId);
      if (!result.ok) {
        showToast(
          `Compare up to ${MAX_COMPARE_PROPERTIES} properties — remove one first`,
          "info",
        );
        return result;
      }

      if (user) {
        const ok = await addComparedProperty(user.id, propertyId);
        if (!ok) {
          removeCompareId(propertyId);
          showToast("Couldn't add to compare. Please try again.", "error");
          return { ok: false, reason: "max", ids: getCompareIds() };
        }
        clearPendingAuthIntent();
        void profilePrompt?.promptIfNeeded("default");
      }

      return result;
    } finally {
      setBusy(false);
    }
  }, [compared, propertyId, user, showToast, profilePrompt]);

  const addAndGo = useCallback(async () => {
    if (!user) {
      if (!isPropertyCompared(propertyId)) {
        addCompareId(propertyId);
      }
      router.push(
        buildLoginUrlWithIntent({
          action: "compare",
          propertyId,
          returnUrl: "/buyer/compare",
        }),
      );
      return;
    }

    if (compared) {
      router.push("/buyer/compare");
      return;
    }

    const result = await toggle();
    if (result.ok && result.compared) {
      router.push("/buyer/compare");
    }
  }, [user, propertyId, router, toggle, compared]);

  return {
    compared,
    toggle,
    addAndGo,
    busy,
    hydrated,
    count: ids.length,
    maxCompare: MAX_COMPARE_PROPERTIES,
    isAuthenticated: !!user,
  };
}
