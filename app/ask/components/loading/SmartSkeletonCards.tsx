"use client";

export function PropertyCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
      <div className="relative aspect-[16/10] bg-gradient-to-br from-neutral-100 via-emerald-50/40 to-neutral-100">
        <div className="absolute inset-0 animate-shimmer opacity-60" />
        <div className="absolute left-3 top-3 h-5 w-14 rounded-md bg-white/80" />
      </div>
      <div className="space-y-2.5 p-3.5">
        <div className="h-3.5 w-[75%] rounded-full bg-neutral-100" />
        <div className="h-3 w-[50%] rounded-full bg-neutral-100" />
        <div className="flex gap-2 pt-1">
          <div className="h-6 w-16 rounded-lg bg-emerald-50" />
          <div className="h-6 w-20 rounded-lg bg-neutral-100" />
        </div>
      </div>
    </div>
  );
}

export function PriceChartSkeleton() {
  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
      <div className="mb-3 h-3 w-24 rounded-full bg-neutral-100" />
      <div className="flex h-24 items-end gap-1.5 px-1">
        {[40, 55, 48, 70, 62, 78, 68, 85].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-md bg-gradient-to-t from-emerald-100 to-emerald-300/70 transition-all"
            style={{
              height: `${h}%`,
              animation: `pulse-slow 2.4s ease-in-out ${i * 0.08}s infinite`,
            }}
          />
        ))}
      </div>
      <div className="mt-3 flex justify-between">
        <div className="h-2.5 w-10 rounded-full bg-neutral-100" />
        <div className="h-2.5 w-10 rounded-full bg-neutral-100" />
        <div className="h-2.5 w-10 rounded-full bg-neutral-100" />
      </div>
    </div>
  );
}

export function BuilderCardSkeleton() {
  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-sm font-bold text-emerald-700">
          B
        </div>
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-32 rounded-full bg-neutral-100" />
          <div className="h-3 w-20 rounded-full bg-neutral-100" />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {["Delivery", "Trust", "RERA"].map((label) => (
          <div key={label} className="rounded-xl bg-[#F7F9F8] px-2 py-2 text-center">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-muted">{label}</p>
            <div className="mx-auto mt-1.5 h-3 w-8 animate-pulse rounded-full bg-emerald-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AreaAnalysisSkeleton() {
  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
      <div className="flex items-center gap-2">
        <span className="text-base" aria-hidden>
          📍
        </span>
        <div className="h-3.5 w-28 rounded-full bg-neutral-100" />
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-3 w-full rounded-full bg-neutral-100" />
        <div className="h-3 w-[83%] rounded-full bg-neutral-100" />
        <div className="h-3 w-[66%] rounded-full bg-neutral-100" />
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {["Connectivity", "Schools", "Growth"].map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-800"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

export function SchoolCardSkeleton() {
  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
      <div className="flex items-center gap-2">
        <span aria-hidden>🏫</span>
        <div className="h-3.5 w-36 rounded-full bg-neutral-100" />
      </div>
      <div className="mt-3 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <div className="h-3 flex-1 rounded-full bg-neutral-100" />
            <div className="h-3 w-12 rounded-full bg-emerald-50" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SmartSkeletonCards() {
  return (
    <div className="space-y-3">
      <PropertyCardSkeleton />
      <PriceChartSkeleton />
      <BuilderCardSkeleton />
      <AreaAnalysisSkeleton />
      <SchoolCardSkeleton />
    </div>
  );
}
