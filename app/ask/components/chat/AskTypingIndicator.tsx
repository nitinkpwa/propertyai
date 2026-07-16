"use client";

export function AskTypingIndicator({ status }: { status: string }) {
  return (
    <div className="flex items-start gap-3 animate-in fade-in duration-300">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-[10px] font-bold text-white">
        IQ
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-tl-md border border-neutral-200/80 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2.5 text-sm text-body">
          <span className="inline-flex gap-1" aria-hidden>
            {[0, 1, 2].map((dot) => (
              <span
                key={dot}
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500"
                style={{ animationDelay: `${dot * 0.15}s` }}
              />
            ))}
          </span>
          <span className="text-muted">{status}</span>
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-2.5 w-48 animate-pulse rounded-full bg-neutral-100" />
          <div className="h-2.5 w-36 animate-pulse rounded-full bg-neutral-100" />
          <div className="h-2.5 w-40 animate-pulse rounded-full bg-neutral-100" />
        </div>
      </div>
    </div>
  );
}
