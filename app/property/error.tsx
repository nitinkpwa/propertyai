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
      title="Property page error"
      description="Try again or browse other listings. Your saved properties are unaffected."
    />
  );
}
