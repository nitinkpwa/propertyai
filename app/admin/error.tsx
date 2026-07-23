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
      title="Admin panel error"
      description="Try again or reload. Your drafts in local storage are kept unless a version upgrade cleared them."
    />
  );
}
