"use client";

import type {
  ConnectPartnerActivity,
  ConnectPartnerAnalytics,
  ConnectPartnerBuyerRow,
  ConnectPartnerPropertyRow,
} from "@/lib/connect/partners/types";
import type { ConnectSiteVisitRow } from "@/lib/crm/types";
import { connectTokens, formatBudget, formatPrice, getGreeting } from "@/lib/connect/design";

interface DashboardPanelProps {
  companyName?: string;
  userName?: string;
  analytics: ConnectPartnerAnalytics;
  leads: ConnectPartnerBuyerRow[];
  properties: ConnectPartnerPropertyRow[];
  activities: ConnectPartnerActivity[];
  siteVisits: ConnectSiteVisitRow[];
  onNavigate: (tab: string) => void;
}

export default function ConnectDashboardPanel({
  companyName,
  userName,
  analytics,
  leads,
  properties,
  activities,
  siteVisits,
  onNavigate,
}: DashboardPanelProps) {
  const firstName = userName?.split(" ")[0] ?? companyName ?? "Partner";
  const pendingVisits = siteVisits.filter((v) => v.status === "pending_approval").length;
  const hotLeads = leads.filter((l) => l.lead_temperature === "hot");
  const conversionRate = analytics.totalBuyers > 0
    ? Math.round((analytics.closed / analytics.totalBuyers) * 100)
    : 0;
  const pipelineValue = properties.reduce((sum, p) => sum + p.price * (p.enquiry_count || 1), 0);

  const overdueFollowUps = leads.filter((l) => l.follow_up_date && new Date(l.follow_up_date) < new Date()).length;
  const tasks = [
    pendingVisits > 0 && { icon: "📅", title: `${pendingVisits} visits need approval`, href: "visits" },
    overdueFollowUps > 0 && { icon: "⏰", title: `${overdueFollowUps} overdue follow-up${overdueFollowUps > 1 ? "s" : ""}`, href: "leads" },
    hotLeads.length > 0 && { icon: "🔥", title: `Follow up ${hotLeads.length} hot lead${hotLeads.length > 1 ? "s" : ""}`, href: "leads" },
    analytics.todaysBuyers > 0 && { icon: "📩", title: `${analytics.todaysBuyers} new enquiries today`, href: "leads" },
  ].filter(Boolean) as { icon: string; title: string; href: string }[];

  if (tasks.length === 0) {
    tasks.push({ icon: "🏠", title: "Review assigned properties performance", href: "properties" });
  }

  return (
    <div className="space-y-8">
      <div className={connectTokens.hero}>
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-200">{getGreeting()}</p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{firstName}, your sales command center</h1>
          <p className="mt-2 max-w-xl text-sm text-white/70">
            {properties.length} assigned properties · {analytics.totalBuyers} property leads · {conversionRate}% conversion
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => onNavigate("leads")} className={connectTokens.btnPrimary}>View Leads</button>
            <button type="button" onClick={() => onNavigate("pipeline")} className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur hover:bg-white/20">Open Pipeline</button>
          </div>
        </div>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-bold text-heading-primary">Today&apos;s Tasks</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <button key={task.title} type="button" onClick={() => onNavigate(task.href)} className={`${connectTokens.card} p-4 text-left hover:shadow-md`}>
              <span className="text-2xl">{task.icon}</span>
              <p className="mt-2 text-sm font-semibold text-heading-primary">{task.title}</p>
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
        {[
          { label: "Property Leads", value: analytics.totalBuyers, icon: "👤" },
          { label: "Hot Leads", value: analytics.hot, icon: "🔥" },
          { label: "Conversion", value: `${conversionRate}%`, icon: "📈" },
          { label: "Pipeline Value", value: formatPrice(pipelineValue), icon: "💰" },
          { label: "Properties", value: analytics.properties, icon: "🏠" },
          { label: "Site Visits", value: analytics.visitsScheduled, icon: "📅" },
        ].map((stat) => (
          <div key={stat.label} className={`${connectTokens.card} p-4`}>
            <span className="text-lg">{stat.icon}</span>
            <p className="mt-2 text-xl font-bold text-heading-primary">{stat.value}</p>
            <p className="text-xs text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={`${connectTokens.card} p-5`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-heading-primary">Recent Enquiries</h2>
            <button type="button" onClick={() => onNavigate("leads")} className="text-sm font-semibold text-emerald-600">View all →</button>
          </div>
          {leads.length === 0 ? (
            <p className="text-sm text-muted">Enquiries from your assigned properties appear here.</p>
          ) : (
            <div className="space-y-3">
              {leads.slice(0, 5).map((lead) => (
                <div key={lead.id} className="rounded-xl border border-neutral-100 bg-neutral-50/50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-heading-primary">{lead.full_name ?? "Buyer"}</p>
                      <p className="text-xs text-muted">{lead.property_title ?? "Property lead"}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${lead.lead_temperature === "hot" ? "bg-rose-100 text-rose-700" : lead.lead_temperature === "warm" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                      {lead.lead_temperature}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-body">{formatBudget(lead.budget_min, lead.budget_max)} · {lead.lead_status}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={`${connectTokens.card} p-5`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-heading-primary">Upcoming Visits</h2>
            <button type="button" onClick={() => onNavigate("visits")} className="text-sm font-semibold text-emerald-600">Manage →</button>
          </div>
          {siteVisits.filter((v) => ["pending_approval", "accepted", "scheduled"].includes(v.status)).length === 0 ? (
            <p className="text-sm text-muted">No upcoming visits scheduled.</p>
          ) : (
            <div className="space-y-3">
              {siteVisits.filter((v) => ["pending_approval", "accepted", "scheduled"].includes(v.status)).slice(0, 4).map((v) => (
                <div key={v.id} className="rounded-xl border border-neutral-100 p-3">
                  <p className="font-semibold text-heading-primary">{v.property?.title ?? "Visit"}</p>
                  <p className="text-xs text-muted">{v.visit_date} · {String(v.visit_time).slice(0, 5)} · {v.status.replace("_", " ")}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className={`${connectTokens.card} p-5`}>
        <h2 className="mb-4 font-bold text-heading-primary">🤖 AI Suggestions</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {hotLeads.length > 0 ? (
            <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-4 text-sm">
              <p className="font-semibold text-violet-900">Priority: {hotLeads[0].full_name}</p>
              <p className="mt-1 text-violet-800">High-intent buyer on {hotLeads[0].property_title}. Call within 2 hours for best conversion.</p>
            </div>
          ) : null}
          {pendingVisits > 0 ? (
            <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 text-sm">
              <p className="font-semibold text-amber-900">{pendingVisits} visits awaiting approval</p>
              <p className="mt-1 text-amber-800">Approve quickly — buyers lose interest after 24h without confirmation.</p>
            </div>
          ) : null}
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 text-sm">
            <p className="font-semibold text-emerald-900">Performance Score: {Math.min(100, 60 + conversionRate + analytics.hot * 5)}/100</p>
            <p className="mt-1 text-emerald-800">Keep response time under 2 hours to improve your partner ranking.</p>
          </div>
        </div>
      </section>

      {activities.length > 0 ? (
        <section className={`${connectTokens.card} p-5`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-heading-primary">Recent Activity</h2>
            <button type="button" onClick={() => onNavigate("activities")} className="text-sm font-semibold text-emerald-600">Full timeline →</button>
          </div>
          <div className="space-y-2">
            {activities.slice(0, 5).map((a) => (
              <p key={a.id} className="text-sm text-body">
                <span className="font-medium text-heading-secondary">{a.type.replace(/_/g, " ")}</span>
                {a.description ? ` — ${a.description}` : ""}
                <span className="ml-2 text-xs text-muted">{new Date(a.created_at).toLocaleDateString("en-IN")}</span>
              </p>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
