export default function PropertyLoading() {
  return (
    <div className="min-h-screen bg-neutral-50 pt-layout">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-64 animate-pulse rounded-2xl bg-neutral-200 sm:h-80" />
        <div className="mt-6 grid w-full gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] lg:items-start">
          <div className="min-w-0 space-y-4">
            <div className="h-8 w-2/3 animate-pulse rounded-lg bg-neutral-200" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-neutral-200" />
            <div className="h-32 animate-pulse rounded-xl bg-neutral-200" />
            <div className="h-48 animate-pulse rounded-xl bg-neutral-200" />
          </div>
          <div className="hidden h-72 animate-pulse rounded-2xl bg-neutral-200 lg:block" />
        </div>
        <div className="mt-6 h-64 w-full animate-pulse rounded-2xl bg-neutral-200" />
      </div>
    </div>
  );
}
