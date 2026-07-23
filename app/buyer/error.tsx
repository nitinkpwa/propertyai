"use client";

import RecoveryScreen from "@/components/stability/RecoveryScreen";

export default function BuyerError({
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
      title="This page hit a snag"
      description="We couldn't render this screen. Your data is safe — try again or head home."
    />
  );
}
