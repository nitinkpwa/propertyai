"use client";

import { requestOnboardingRestart } from "@/lib/onboarding/storage";

export default function RestartTourButton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => requestOnboardingRestart()}
      className={
        className ||
        "text-sm text-muted underline-offset-2 transition-colors hover:text-heading-primary hover:underline"
      }
    >
      Restart Tour
    </button>
  );
}
