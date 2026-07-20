"use client";

import ErrorState from "@/components/ui/ErrorState";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <ErrorState
        title="Something went wrong"
        description="Please try again. If the problem continues, head home and retry from there."
        onRetry={reset}
      />
    </div>
  );
}
