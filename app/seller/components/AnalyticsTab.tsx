"use client";

import type { SellerAnalytics } from "@/lib/seller/types";

export default function AnalyticsTab({ analytics }: { analytics: SellerAnalytics }) {
  if (!analytics.hasData) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-white px-6 py-16 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-50 text-3xl">
          📈
        </div>
        <h3 className="text-lg font-semibold text-neutral-900">No analytics available yet</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-500">
          Analytics will appear once buyers view or save your listings.
        </p>
      </div>
    );
  }

  const metrics = [
    { label: "Property Views", value: analytics.totalViews, icon: "👁️" },
    { label: "Favorites", value: analytics.totalFavorites, icon: "❤️" },
    { label: "Leads", value: analytics.totalLeads, icon: "📩" },
    { label: "Visits", value: analytics.totalVisits, icon: "📅" },
  ];

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all hover:shadow-md"
          >
            <div className="mb-2 text-lg">{m.icon}</div>
            <p className="text-2xl font-bold text-neutral-900">{m.value}</p>
            <p className="mt-1 text-xs font-medium text-neutral-500">{m.label}</p>
          </div>
        ))}
      </div>

      {analytics.mostViewedProperty ? (
        <div className="mb-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Most Viewed Property</p>
          <p className="mt-1 font-semibold text-neutral-900">{analytics.mostViewedProperty.title}</p>
          <p className="mt-1 text-sm text-emerald-600">{analytics.mostViewedProperty.count} views</p>
        </div>
      ) : null}

      {analytics.mostSavedProperty ? (
        <div className="mb-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Most Saved Property</p>
          <p className="mt-1 font-semibold text-neutral-900">{analytics.mostSavedProperty.title}</p>
          <p className="mt-1 text-sm text-emerald-600">{analytics.mostSavedProperty.count} saves</p>
        </div>
      ) : null}

      {analytics.monthlyViews.length > 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="mb-3 font-semibold text-neutral-900">Monthly Performance (Views)</p>
          {analytics.monthlyViews.map((row) => (
            <div key={row.month} className="flex justify-between border-b border-neutral-100 py-2 text-sm last:border-0">
              <span className="text-neutral-600">{row.month}</span>
              <span className="font-semibold text-neutral-900">{row.count}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
