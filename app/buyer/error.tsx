"use client";

import { useEffect } from "react";
import RecoveryScreen from "@/components/stability/RecoveryScreen";
import DevCrashOverlay from "@/components/stability/DevCrashOverlay";
import { recordCrash } from "@/lib/stability/crashReport";

export default function BuyerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    recordCrash({
      component: "buyer/error.tsx",
      message: error.message,
      stack: error.stack,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="space-y-6">
      {process.env.NODE_ENV === "development" ? (
        <div className="px-4 pt-8">
          <DevCrashOverlay error={error} component="Buyer route error" reset={reset} />
        </div>
      ) : null}
      <RecoveryScreen
        error={error}
        reset={reset}
        title="This page hit a snag"
        description="We couldn't render this screen. Your data is safe — try again or head home."
      />
    </div>
  );
}
