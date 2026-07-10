import { Suspense } from "react";
import Logo from "@/components/common/Logo";
import PropertyListings from "../components/PropertyListings";

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
      <main className="flex-1 pt-16">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
          <h1 className="mb-8 text-2xl font-bold tracking-tight text-heading-primary sm:mb-10 sm:text-3xl">
            Featured Properties
          </h1>
          <Suspense fallback={<ListingsFallback />}>
            <PropertyListings />
          </Suspense>
        </div>
      </main>

      <footer className="border-t border-neutral-200 bg-neutral-900 text-muted">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
          <Logo size="footer" variant="dark" href="/" />
          <p className="text-center text-xs sm:text-sm">
            AI-Powered Property Intelligence · Chandigarh · Mohali · Panchkula
          </p>
          <p className="text-xs sm:text-sm">© {new Date().getFullYear()} AreaIQ</p>
        </div>
      </footer>
    </div>
  );
}
