"use client";

import type { SellerDashboardStats } from "@/lib/seller/types";

const STAT_CARDS: Array<{
  key: keyof SellerDashboardStats;
  label: string;
  description: string;
  icon: string;
}> = [
  { key: "totalProperties", label: "Total Properties", description: "All listings", icon: "🏠" },
  { key: "activeListings", label: "Active Listings", description: "Live on AreaIQ", icon: "✅" },
  { key: "draftListings", label: "Draft Listings", description: "Not published", icon: "📝" },
  { key: "soldListings", label: "Sold Listings", description: "Completed deals", icon: "🏷️" },
  { key: "totalViews", label: "Views", description: "Total impressions", icon: "👁️" },
  { key: "savedByBuyers", label: "Saved", description: "Buyer favorites", icon: "❤️" },
  { key: "leadsReceived", label: "Leads", description: "Inquiries received", icon: "📩" },
  { key: "siteVisits", label: "Visits", description: "Scheduled tours", icon: "📅" },
];

export default function DashboardHome({ stats }: { stats: SellerDashboardStats }) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight text-heading-primary">Dashboard Overview</h2>
        <p className="mt-1 text-sm text-muted">Track your listings and buyer engagement at a glance.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_CARDS.map((s) => (
          <div
            key={s.key}
            className="group rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-50 text-lg transition-colors group-hover:bg-emerald-50">
              {s.icon}
            </div>
            <p className="text-3xl font-bold tracking-tight text-heading-primary">{stats[s.key]}</p>
            <p className="mt-1 text-sm font-semibold text-heading-secondary">{s.label}</p>
            <p className="mt-0.5 text-xs text-muted">{s.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
