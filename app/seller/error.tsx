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
      title="Seller dashboard error"
      description="Try again or reload. Your listings remain on the server."
    />
  );
}
