"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  fetchComparedPropertyIds,
  syncComparedProperties,
} from "@/lib/buyer/queries";
import { mergeCompareIds } from "@/lib/buyer/compareStore";

/**
 * One-shot guest↔Supabase compare merge after login.
 * Mounted once via CompareQueueBar / root layout.
 */
export default function CompareSync() {
  const { user } = useAuth();
  const syncedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      syncedFor.current = null;
      return;
    }
    if (syncedFor.current === user.id) return;
    syncedFor.current = user.id;

    let cancelled = false;
    (async () => {
      const remote = await fetchComparedPropertyIds(user.id);
      if (cancelled) return;
      const merged = mergeCompareIds(remote);
      await syncComparedProperties(user.id, merged);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return null;
}
