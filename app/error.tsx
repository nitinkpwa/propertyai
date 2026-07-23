"use client";

import { useEffect } from "react";
import RecoveryScreen from "@/components/stability/RecoveryScreen";
import DevCrashOverlay from "@/components/stability/DevCrashOverlay";
import { recordCrash } from "@/lib/stability/crashReport";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    recordCrash({
      component: "app/error.tsx",
      message: error.message,
      stack: error.stack,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="space-y-6">
      {process.env.NODE_ENV === "development" ? (
        <div className="px-4 pt-8">
          <DevCrashOverlay error={error} component="App error boundary" reset={reset} />
        </div>
      ) : null}
      <RecoveryScreen
        error={error}
        reset={reset}
        title="Something went wrong"
        description="Please try again. If the problem continues, reload the page or head home."
      />
    </div>
  );
}
