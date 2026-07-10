"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { EMERALD } from "@/lib/auth/constants";

export default function BuilderDashboardPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?redirect=/builder");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 pt-16">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 pt-24 pb-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-neutral-200/80 bg-white p-8 shadow-[0_8px_32px_rgba(0,0,0,0.06)] sm:p-10">
          <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
                Builder Dashboard
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-heading-primary">
                Welcome, {profile?.full_name ?? "Builder"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted">
                Manage your projects, monitor leads, and track performance across
                your AreaIQ builder portfolio.
              </p>
            </div>
            <Link
              href="/seller"
              className="inline-flex rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(34,197,94,0.35)]"
              style={{ backgroundColor: EMERALD }}
            >
              Manage Listings
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Active Projects", value: "—" },
              { label: "New Leads", value: "—" },
              { label: "Verified Listings", value: "—" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-neutral-100 bg-neutral-50/80 px-5 py-4"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-label">
                  {item.label}
                </p>
                <p className="mt-2 text-2xl font-bold text-heading-primary">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
