"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  clearPendingAuthIntent,
  matchPendingIntentForProperty,
  type PendingAuthAction,
} from "@/lib/auth/pendingIntent";
import { addComparedProperty, toggleSavedProperty } from "@/lib/buyer/queries";
import { addCompareId } from "@/lib/buyer/compareStore";

interface Props {
  propertyId: string;
  onAskAi?: () => void;
}

/**
 * After login/signup, resume the protected action that triggered auth.
 * `book_visit` is handled by BookVisitResumeEffect (opens modal immediately).
 */
export default function PendingActionResume({ propertyId, onAskAi }: Props) {
  const { user, loading } = useAuth();
  const handledRef = useRef(false);

  useEffect(() => {
    if (loading || !user || handledRef.current) return;

    const intent = matchPendingIntentForProperty(propertyId);
    if (!intent) return;
    // Site visit modal resume lives in BookSiteVisitProvider
    if (intent.action === "book_visit") return;

    handledRef.current = true;
    const action = intent.action as PendingAuthAction;

    const run = async () => {
      try {
        switch (action) {
          case "save_property":
            await toggleSavedProperty(user.id, propertyId, true);
            clearPendingAuthIntent();
            window.dispatchEvent(
              new CustomEvent("areaiq:pending-save-complete", { detail: { propertyId } }),
            );
            break;
          case "compare":
            addCompareId(propertyId);
            await addComparedProperty(user.id, propertyId);
            clearPendingAuthIntent();
            window.location.assign("/buyer/compare");
            break;
          case "ask_areaiq":
            clearPendingAuthIntent();
            onAskAi?.();
            document
              .getElementById("property-ask-panel")
              ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            break;
          case "contact_seller":
          case "request_callback":
          case "download_brochure":
          case "share_inquiry":
            clearPendingAuthIntent();
            break;
          default:
            clearPendingAuthIntent();
        }
      } catch {
        clearPendingAuthIntent();
      }
    };

    void run();
  }, [loading, user, propertyId, onAskAi]);

  return null;
}
