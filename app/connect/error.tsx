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
      title="Connect portal error"
      description="Try again or reload. Partner data is stored securely on the server."
    />
  );
}
