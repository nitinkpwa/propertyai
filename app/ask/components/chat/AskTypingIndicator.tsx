"use client";

export function AskTypingIndicator({ status }: { status: string }) {
  return (
    <div
      className="flex items-start gap-3"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white shadow-sm">
        IQ
      </div>
      <div className="max-w-[min(88%,36rem)] rounded-[1.25rem] rounded-bl-md border border-neutral-200/80 bg-white px-4 py-3.5 shadow-sm">
        <div className="flex items-center gap-2.5 text-sm text-body">
          <span className="inline-flex gap-1" aria-hidden>
            {[0, 1, 2].map((dot) => (
              <span
                key={dot}
                className="h-2 w-2 animate-bounce rounded-full bg-brand"
                style={{ animationDelay: `${dot * 0.15}s` }}
              />
            ))}
          </span>
          <span className="text-muted">{status || "Thinking…"}</span>
        </div>
        <div className="mt-3 space-y-2" aria-hidden>
          <div className="h-2.5 w-44 animate-shimmer rounded-full" />
          <div className="h-2.5 w-32 animate-shimmer rounded-full" />
          <div className="h-2.5 w-36 animate-shimmer rounded-full" />
        </div>
      </div>
    </div>
  );
}
