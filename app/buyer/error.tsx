"use client";

import ErrorState from "@/components/ui/ErrorState";

export default function BuyerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg py-10">
      <ErrorState
        title="This page hit a snag"
        description={
          error?.message
            ? "We couldn't render this screen. Your data is safe — try again."
            : "Something interrupted this buyer page. Try again in a moment."
        }
        onRetry={reset}
      />
    </div>
  );
}
