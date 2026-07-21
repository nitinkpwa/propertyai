"use client";

import { AskAdvisorLoading } from "../loading/AskAdvisorLoading";

/** @deprecated Prefer AskAdvisorLoading — kept as a thin alias for call sites. */
export function AskTypingIndicator({ status: _status }: { status?: string }) {
  return <AskAdvisorLoading active />;
}
