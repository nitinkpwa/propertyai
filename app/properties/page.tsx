import type { Metadata } from "next";
import { Suspense } from "react";
import PropertyListings from "../components/PropertyListings";

export const metadata: Metadata = {
  title: "Featured Properties · AreaIQ",
  description:
    "Browse live listings with AreaIQ Property Intelligence — pricing, trust, growth, and rental insights across Mohali, Chandigarh, and Zirakpur.",
  alternates: { canonical: "/properties" },
};

/** Cache public listings shell — data still loads client-side. */
export const revalidate = 60;
function ListingsFallback() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-24 rounded-2xl bg-neutral-200/70" />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-96 rounded-2xl bg-neutral-200/70" />
        ))}
      </div>
    </div>
  );
}

export default function PropertiesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <main className="flex-1 pt-layout">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
          <h1 className="mb-6 text-[32px] font-bold tracking-tight text-heading-primary sm:mb-8 lg:text-3xl">
            Featured Properties
          </h1>
          <Suspense fallback={<ListingsFallback />}>
            <PropertyListings />
          </Suspense>
        </div>
      </main>

      <footer className="border-t border-neutral-200 bg-neutral-900 text-muted">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
          <p className="text-sm font-semibold text-white">AreaIQ</p>
          <p className="text-center text-xs sm:text-sm">
            Property Intelligence · Powered by Tech172
          </p>
          <p className="text-xs sm:text-sm">
            © {new Date().getFullYear()} AreaIQ · Tech172 Intelligence
          </p>
        </div>
      </footer>
    </div>
  );
}
