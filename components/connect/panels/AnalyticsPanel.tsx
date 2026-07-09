"use client";

import type { ConnectPartnerAnalytics, ConnectPartnerBuyerRow, ConnectPartnerPropertyRow } from "@/lib/connect/partners/types";
import { connectTokens } from "@/lib/connect/design";

interface Props {
  analytics: ConnectPartnerAnalytics;
  leads: ConnectPartnerBuyerRow[];
  properties: ConnectPartnerPropertyRow[];
}

function FunnelChart({ leads }: { leads: ConnectPartnerBuyerRow[] }) {
  const stages = [
    { label: "New", count: leads.filter((l) => l.lead_status === "new").length },
    { label: "Contacted", count: leads.filter((l) => ["interested", "inquiry_sent"].includes(l.lead_status ?? "")).length },
    { label: "Qualified", count: leads.filter((l) => l.lead_status === "ai_qualified").length },
    { label: "Visit", count: leads.filter((l) => ["visit_scheduled", "visited"].includes(l.lead_status ?? "")).length },
    { label: "Negotiation", count: leads.filter((l) => l.lead_status === "negotiation").length },
    { label: "Closed", count: leads.filter((l) => l.lead_status === "completed").length },
  ];
  const max = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="space-y-3">
      {stages.map((s) => (
        <div key={s.label} className="flex items-center gap-3">
          <span className="w-24 text-xs font-medium text-neutral-600">{s.label}</span>
          <div className="flex-1 rounded-full bg-neutral-100 h-3 overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(s.count / max) * 100}%` }} />
          </div>
          <span className="w-8 text-right text-xs font-bold text-neutral-800">{s.count}</span>
        </div>
      ))}
    </div>
  );
}

function SourceChart({ leads }: { leads: ConnectPartnerBuyerRow[] }) {
  const sources: Record<string, number> = {};
  for (const l of leads) {
    const src = l.lead_source?.replace(/_/g, " ") ?? "Enquiry";
    sources[src] = (sources[src] ?? 0) + 1;
  }
  const entries = Object.entries(sources).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map((e) => e[1]), 1);
  const colors = ["bg-emerald-500", "bg-blue-500", "bg-violet-500", "bg-amber-500"];

  return (
    <div className="space-y-2">
      {entries.length === 0 ? <p className="text-sm text-neutral-500">No lead source data yet</p> : null}
      {entries.map(([src, count], i) => (
        <div key={src} className="flex items-center gap-2">
          <span className="w-28 truncate text-xs text-neutral-600 capitalize">{src}</span>
          <div className="flex-1 h-2 rounded-full bg-neutral-100 overflow-hidden">
            <div className={`h-full ${colors[i % colors.length]}`} style={{ width: `${(count / max) * 100}%` }} />
          </div>
          <span className="text-xs font-bold">{count}</span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPanel({ analytics, leads, properties }: Props) {
  const conversionRate = analytics.totalBuyers > 0 ? Math.round((analytics.closed / analytics.totalBuyers) * 100) : 0;
  const bestProperty = [...properties].sort((a, b) => b.enquiry_count - a.enquiry_count)[0];

  return (
    <div className="space-y-8">
      <div>
        <h2 className={connectTokens.heading}>Analytics</h2>
        <p className={connectTokens.subheading}>Real performance data from your assigned properties</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={`${connectTokens.card} p-6`}>
          <h3 className="mb-4 font-bold text-neutral-900">Lead Funnel</h3>
          <FunnelChart leads={leads} />
        </section>
        <section className={`${connectTokens.card} p-6`}>
          <h3 className="mb-4 font-bold text-neutral-900">Lead Sources</h3>
          <SourceChart leads={leads} />
        </section>
      </div>

      <section className={`${connectTokens.card} p-6`}>
        <h3 className="mb-4 font-bold text-neutral-900">Monthly Activity</h3>
        {analytics.monthlyActivity.length === 0 ? (
          <p className="text-sm text-neutral-500">No activity data yet.</p>
        ) : (
          <div className="flex h-48 items-end gap-2">
            {analytics.monthlyActivity.map((m) => {
              const max = Math.max(...analytics.monthlyActivity.map((x) => x.count), 1);
              return (
                <div key={m.month} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-[10px] font-bold text-neutral-700">{m.count}</span>
                  <div className="w-full rounded-t-lg bg-gradient-to-t from-emerald-600 to-emerald-400" style={{ height: `${Math.max(8, (m.count / max) * 100)}%` }} />
                  <span className="text-[10px] text-neutral-500">{m.month.slice(5)}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Conversion Rate", value: `${conversionRate}%` },
          { label: "Hot Leads", value: analytics.hot },
          { label: "Visits Scheduled", value: analytics.visitsScheduled },
          { label: "Closed Deals", value: analytics.closed },
          { label: "In Negotiation", value: analytics.negotiation },
          { label: "Lost", value: analytics.lost },
          { label: "Active Listings", value: analytics.listings },
          { label: "Best Property", value: bestProperty?.title?.slice(0, 20) ?? "—" },
        ].map((s) => (
          <div key={s.label} className={`${connectTokens.card} p-4`}>
            <p className="text-xs text-neutral-500">{s.label}</p>
            <p className="mt-1 text-xl font-bold text-neutral-900">{s.value}</p>
          </div>
        ))}
      </div>

      {properties.length > 0 ? (
        <section className={`${connectTokens.card} p-6`}>
          <h3 className="mb-4 font-bold text-neutral-900">Property Performance</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs text-neutral-500">
                  <th className="pb-2 pr-4">Property</th>
                  <th className="pb-2 pr-4">Enquiries</th>
                  <th className="pb-2 pr-4">Visits</th>
                  <th className="pb-2 pr-4">Hot Leads</th>
                  <th className="pb-2">Conv.</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((p) => (
                  <tr key={p.id} className="border-b border-neutral-50">
                    <td className="py-2 pr-4 font-medium">{p.title}</td>
                    <td className="py-2 pr-4">{p.enquiry_count}</td>
                    <td className="py-2 pr-4">{p.visit_count}</td>
                    <td className="py-2 pr-4">{p.hot_leads}</td>
                    <td className="py-2">{p.enquiry_count > 0 ? Math.round((p.visit_count / p.enquiry_count) * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
