interface SkeletonProps {
  className?: string;
  /** Use shimmer instead of pulse */
  shimmer?: boolean;
}

export function Skeleton({ className = "", shimmer = true }: SkeletonProps) {
  return (
    <div
      className={`rounded-xl ${shimmer ? "animate-shimmer" : "animate-pulse bg-neutral-200/70"} ${className}`}
      aria-hidden
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-page-enter" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-48 w-full rounded-3xl" />
      <div className="flex gap-3 overflow-hidden lg:grid lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28 min-w-[140px] rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-3xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-72 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-page-enter" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-40 rounded-2xl" />
      ))}
    </div>
  );
}

export function CardGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-neutral-100">
          <Skeleton className="aspect-video w-full rounded-none" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PropertyCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white" aria-hidden>
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="space-y-4 px-4 py-6" aria-busy="true" aria-label="Loading conversation">
      <Skeleton className="ml-auto h-16 w-3/4 rounded-2xl rounded-br-md" />
      <Skeleton className="h-24 w-4/5 rounded-2xl rounded-bl-md" />
      <Skeleton className="ml-auto h-12 w-1/2 rounded-2xl rounded-br-md" />
      <Skeleton className="h-20 w-3/4 rounded-2xl rounded-bl-md" />
    </div>
  );
}
