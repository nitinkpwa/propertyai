import Link from "next/link";

export default function PropertyNotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 pt-16">
      <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="w-full max-w-lg rounded-3xl border border-neutral-200 bg-white px-8 py-12 text-center shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-3xl">
            🏠
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
            Property Not Found
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
            This listing is unavailable
          </h1>
          <p className="mt-3 text-sm leading-6 text-neutral-500 sm:text-base">
            The property you are looking for may have been removed, sold, or the
            link may be incorrect.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/properties"
              className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(34,197,94,0.35)] transition-all hover:brightness-105"
              style={{ backgroundColor: "#22C55E" }}
            >
              Browse Properties
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-neutral-200 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
