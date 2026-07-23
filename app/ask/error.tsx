"use client";

import RecoveryScreen from "@/components/stability/RecoveryScreen";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RecoveryScreen
      error={error}
      reset={reset}
      title="Ask AreaIQ hit a snag"
      description="Reload or go home — your previous conversations are preserved when signed in."
    />
  );
}
