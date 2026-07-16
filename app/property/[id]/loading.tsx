export default function PropertyLoading() {
  return (
    <div className="min-h-screen bg-neutral-50 pt-20">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-64 animate-pulse rounded-2xl bg-neutral-200 sm:h-80" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            <div className="h-8 w-2/3 animate-pulse rounded-lg bg-neutral-200" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-neutral-200" />
            <div className="h-32 animate-pulse rounded-xl bg-neutral-200" />
            <div className="h-48 animate-pulse rounded-xl bg-neutral-200" />
          </div>
          <div className="h-72 animate-pulse rounded-2xl bg-neutral-200" />
        </div>
      </div>
    </div>
  );
}
