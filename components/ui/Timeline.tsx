interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  time?: string;
  status?: "done" | "current" | "upcoming";
  meta?: React.ReactNode;
}

interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

export default function Timeline({ items, className = "" }: TimelineProps) {
  return (
    <ol className={`relative space-y-0 ${className}`}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        const done = item.status === "done";
        const current = item.status === "current";

        return (
          <li key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
            {!isLast ? (
              <span
                className="absolute left-[11px] top-7 bottom-0 w-0.5 bg-neutral-200"
                aria-hidden
              />
            ) : null}
            <span
              className={`relative z-10 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-4 ring-white ${
                done
                  ? "bg-brand text-white"
                  : current
                    ? "bg-brand-muted ring-brand-border text-brand-dark"
                    : "bg-neutral-100 text-muted"
              }`}
              aria-hidden
            >
              {done ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <span className={`h-2 w-2 rounded-full ${current ? "bg-brand" : "bg-neutral-300"}`} />
              )}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h4 className="text-base font-semibold text-heading-primary">{item.title}</h4>
                {item.time ? <time className="text-xs text-muted">{item.time}</time> : null}
              </div>
              {item.description ? (
                <p className="mt-1 text-sm leading-relaxed text-body">{item.description}</p>
              ) : null}
              {item.meta ? <div className="mt-2">{item.meta}</div> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
