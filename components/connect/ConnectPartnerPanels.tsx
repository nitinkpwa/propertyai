"use client";

import ConnectPartnerActivityTimeline from "@/components/admin/connect/ConnectPartnerActivityTimeline";
import PartnerStatusBadge from "@/components/admin/connect/PartnerStatusBadge";
import LeadTemperatureBadge from "@/components/premium/LeadTemperatureBadge";
import type {
  ConnectPartner,
  ConnectPartnerActivity,
  ConnectPartnerAnalytics,
  ConnectPartnerBuyerRow,
} from "@/lib/connect/partners/types";

function formatBudget(min: number | null, max: number | null): string {
  if (!min && !max) return "—";
  const fmt = (n: number) =>
    n >= 10000000 ? `₹${(n / 10000000).toFixed(1)} Cr` : `₹${(n / 100000).toFixed(0)} L`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (max) return `Up to ${fmt(max)}`;
  return fmt(min!);
}

export function ConnectOverviewPanel({
  analytics,
}: {
  analytics: ConnectPartnerAnalytics;
}) {
  const cards = [
    { label: "Total Buyers", value: analytics.totalBuyers, icon: "👤" },
    { label: "Today's Buyers", value: analytics.todaysBuyers, icon: "📅" },
    { label: "Hot Leads", value: analytics.hot, icon: "🔥" },
    { label: "Warm Leads", value: analytics.warm, icon: "☀️" },
    { label: "Cold Leads", value: analytics.cold, icon: "❄️" },
    { label: "Visits Scheduled", value: analytics.visitsScheduled, icon: "📍" },
    { label: "Negotiation", value: analytics.negotiation, icon: "🤝" },
    { label: "Closed", value: analytics.closed, icon: "✅" },
    { label: "Properties", value: analytics.properties, icon: "🏠" },
    { label: "Active Listings", value: analytics.listings, icon: "📋" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight text-neutral-900">Dashboard Overview</h2>
        <p className="mt-1 text-sm text-neutral-500">Your assigned buyers, properties, and pipeline at a glance.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-50 text-lg">
              {card.icon}
            </div>
            <p className="text-3xl font-bold tracking-tight text-neutral-900">{card.value}</p>
            <p className="mt-1 text-sm font-semibold text-neutral-800">{card.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConnectBuyersPanel({ buyers }: { buyers: ConnectPartnerBuyerRow[] }) {
  if (buyers.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-white py-16 text-center">
        <p className="text-sm text-neutral-500">No buyers assigned to you yet.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {buyers.map((buyer) => (
        <article
          key={buyer.id}
          className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-neutral-900">{buyer.full_name ?? "Buyer"}</h3>
            <LeadTemperatureBadge temperature={buyer.lead_temperature} score={buyer.lead_score} />
          </div>
          <p className="mt-1 text-sm text-neutral-500">{buyer.phone ?? "—"}</p>
          <dl className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-neutral-400">Budget</dt>
              <dd className="font-medium text-emerald-700">{formatBudget(buyer.budget_min, buyer.budget_max)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-neutral-400">Preferred Area</dt>
              <dd className="text-right text-neutral-700">{(buyer.preferred_locations ?? []).slice(0, 2).join(", ") || "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-neutral-400">Property Type</dt>
              <dd className="text-right capitalize text-neutral-700">{(buyer.preferred_property_types ?? []).join(", ") || "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-neutral-400">Purpose</dt>
              <dd className="capitalize text-neutral-700">{buyer.buying_purpose ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-neutral-400">Timeline</dt>
              <dd className="capitalize text-neutral-700">{buyer.buying_timeline ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-neutral-400">Lead Status</dt>
              <dd className="capitalize text-neutral-700">{buyer.lead_status ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-neutral-400">Visit Status</dt>
              <dd className="capitalize text-neutral-700">{buyer.visit_status ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-neutral-400">Last Chat</dt>
              <dd className="text-neutral-700">
                {buyer.last_chat_at
                  ? new Date(buyer.last_chat_at).toLocaleDateString("en-IN")
                  : "—"}
              </dd>
            </div>
          </dl>
          {buyer.buyer_notes ? (
            <p className="mt-3 rounded-xl bg-neutral-50 px-3 py-2 text-xs text-neutral-600">{buyer.buyer_notes}</p>
          ) : null}
        </article>
      ))}
    </div>
  );
}

export function ConnectPropertiesPanel({
  properties,
}: {
  properties: Array<{ id: string; title: string; city: string; price: number; status: string; photos?: string[] }>;
}) {
  if (properties.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-white py-16 text-center">
        <p className="text-sm text-neutral-500">No properties assigned to you yet.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {properties.map((p) => (
        <article key={p.id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="aspect-[4/3] bg-neutral-100">
            {p.photos?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.photos[0]} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-3xl text-neutral-300">🏠</div>
            )}
          </div>
          <div className="p-4">
            <h3 className="font-semibold text-neutral-900">{p.title}</h3>
            <p className="mt-1 text-sm text-neutral-500">{p.city}</p>
            <p className="mt-2 text-sm font-semibold text-emerald-700">
              ₹{p.price.toLocaleString("en-IN")}
            </p>
            <span className="mt-2 inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold capitalize text-neutral-600">
              {p.status}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

export function ConnectAnalyticsPanel({ analytics }: { analytics: ConnectPartnerAnalytics }) {
  return (
    <div className="space-y-6">
      <ConnectOverviewPanel analytics={analytics} />
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-neutral-900">Monthly Activity</h3>
        {analytics.monthlyActivity.length === 0 ? (
          <p className="text-sm text-neutral-500">No activity data yet.</p>
        ) : (
          <div className="flex items-end gap-3 h-40">
            {analytics.monthlyActivity.map((m) => {
              const max = Math.max(...analytics.monthlyActivity.map((x) => x.count), 1);
              const height = `${Math.max(8, (m.count / max) * 100)}%`;
              return (
                <div key={m.month} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t-lg bg-emerald-400"
                    style={{ height }}
                    title={`${m.count} activities`}
                  />
                  <span className="text-[10px] text-neutral-500">{m.month.slice(5)}</span>
                </div>
              );
            })}
          </div>
        )}
        {analytics.responseTimeHours !== null ? (
          <p className="mt-4 text-sm text-neutral-500">
            Avg response time: {analytics.responseTimeHours}h
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function ConnectSettingsPanel({ partner }: { partner: ConnectPartner }) {
  const fields = [
    ["Company", partner.company_name],
    ["Manager", partner.manager_name],
    ["Email", partner.email],
    ["Phone", partner.phone],
    ["City", partner.city ?? "—"],
    ["GST", partner.gst ?? "—"],
    ["RERA", partner.rera ?? "—"],
    ["Address", partner.address ?? "—"],
  ] as const;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-neutral-900">Partner Settings</h3>
        <PartnerStatusBadge status={partner.status} />
      </div>
      <dl className="grid gap-4 sm:grid-cols-2">
        {fields.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-neutral-50 px-4 py-3">
            <dt className="text-xs font-medium uppercase tracking-wider text-neutral-400">{label}</dt>
            <dd className="mt-1 text-sm font-medium text-neutral-900">{value}</dd>
          </div>
        ))}
      </dl>
      {partner.notes ? (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{partner.notes}</p>
      ) : null}
    </div>
  );
}

export function ConnectActivitiesPanel({ activities }: { activities: ConnectPartnerActivity[] }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 font-semibold text-neutral-900">Activity Timeline</h3>
      <ConnectPartnerActivityTimeline activities={activities} maxItems={30} />
    </div>
  );
}
