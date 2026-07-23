"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ConnectPartnerActivityTimeline from "@/components/admin/connect/ConnectPartnerActivityTimeline";
import PartnerFormModal from "@/components/admin/connect/PartnerFormModal";
import PartnerStatusBadge from "@/components/admin/connect/PartnerStatusBadge";
import LeadTemperatureBadge from "@/components/premium/LeadTemperatureBadge";
import { EMERALD } from "@/lib/connect/constants";
import type {
  AdminConnectTab,
  ConnectPartner,
  ConnectPartnerActivity,
  ConnectPartnerAnalytics,
  ConnectPartnerBuyerRow,
  ConnectPartnerListRow,
  ConnectPartnerStatus,
} from "@/lib/connect/partners/types";

const SUB_TABS: { key: AdminConnectTab; label: string; icon: string }[] = [
  { key: "partners", label: "Partners", icon: "🤝" },
  { key: "analytics", label: "Analytics", icon: "📈" },
  { key: "activities", label: "Activities", icon: "📋" },
  { key: "buyers", label: "Buyers", icon: "👤" },
  { key: "properties", label: "Properties", icon: "🏠" },
];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatBudget(min: number | null, max: number | null): string {
  if (!min && !max) return "—";
  const fmt = (n: number) =>
    n >= 10000000 ? `₹${(n / 10000000).toFixed(1)} Cr` : `₹${(n / 100000).toFixed(0)} L`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (max) return `Up to ${fmt(max)}`;
  return fmt(min!);
}

function PartnerProfileView({
  partner,
  buyers,
  properties,
  activities,
  analytics,
  onBack,
  onRefresh,
  onEdit,
}: {
  partner: ConnectPartner;
  buyers: ConnectPartnerBuyerRow[];
  properties: Array<{ id: string; title: string; city: string; price: number; status: string }>;
  activities: ConnectPartnerActivity[];
  analytics: ConnectPartnerAnalytics;
  onBack: () => void;
  onRefresh: () => void;
  onEdit: () => void;
}) {
  const [status, setStatus] = useState(partner.status);
  const [saving, setSaving] = useState(false);

  const updateStatus = async (next: ConnectPartnerStatus) => {
    setSaving(true);
    const res = await fetch(`/api/admin/connect/partners/${partner.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setSaving(false);
    if (res.ok) {
      setStatus(next);
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      <button type="button" onClick={onBack} className="text-sm font-semibold text-emerald-600 hover:text-emerald-700">
        ← Back to partners
      </button>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {partner.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={partner.logo} alt="" className="h-16 w-16 rounded-xl border border-neutral-200 object-contain" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-emerald-50 text-2xl">🏢</div>
            )}
            <div>
              <h2 className="text-2xl font-bold text-heading-primary">{partner.company_name}</h2>
              <p className="mt-1 text-sm text-muted">{partner.manager_name} · {partner.email}</p>
              <p className="text-sm text-muted">{partner.phone} · {partner.city ?? "—"}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <PartnerStatusBadge status={status} />
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={onEdit}
                className="rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-sm font-semibold text-body transition hover:bg-neutral-50"
              >
                Edit Builder
              </button>
              <select
                className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                value={status}
                disabled={saving}
                onChange={(e) => updateStatus(e.target.value as ConnectPartnerStatus)}
                aria-label="Partner status"
              >
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </div>

        <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["GST", partner.gst ?? "—"],
            ["RERA", partner.rera ?? "—"],
            ["Address", partner.address ?? "—"],
            ["Created", formatDate(partner.created_at)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-neutral-50 px-4 py-3">
              <dt className="text-xs font-medium uppercase tracking-wider text-muted">{label}</dt>
              <dd className="mt-1 text-sm font-medium text-heading-primary">{value}</dd>
            </div>
          ))}
        </dl>

        {partner.notes ? (
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{partner.notes}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Buyers", value: analytics.totalBuyers },
          { label: "Properties", value: analytics.properties },
          { label: "Hot Leads", value: analytics.hot },
          { label: "Visits Scheduled", value: analytics.visitsScheduled },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-3xl font-bold text-heading-primary">{card.value}</p>
            <p className="mt-1 text-sm text-muted">{card.label}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-heading-primary">Assigned Buyers ({buyers.length})</h3>
        {buyers.length === 0 ? (
          <p className="text-sm text-muted">No buyers assigned yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {buyers.map((b) => (
              <div key={b.id} className="rounded-xl border border-neutral-100 bg-neutral-50 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-heading-primary">{b.full_name ?? "Buyer"}</p>
                  <LeadTemperatureBadge temperature={b.lead_temperature} score={b.lead_score} />
                </div>
                <p className="mt-1 text-xs text-muted">{b.phone ?? "—"}</p>
                <p className="mt-2 text-xs text-emerald-700">{formatBudget(b.budget_min, b.budget_max)}</p>
                <p className="mt-1 text-xs capitalize text-muted">Status: {b.lead_status}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-heading-primary">Assigned Properties ({properties.length})</h3>
        {properties.length === 0 ? (
          <p className="text-sm text-muted">No properties assigned yet.</p>
        ) : (
          <ul className="space-y-2">
            {properties.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-3 text-sm">
                <span className="font-medium text-heading-primary">{p.title}</span>
                <span className="text-muted">{p.city} · {p.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-heading-primary">Activity Timeline</h3>
        <ConnectPartnerActivityTimeline activities={activities} />
      </section>
    </div>
  );
}

export default function AdminConnectPanel() {
  const [subTab, setSubTab] = useState<AdminConnectTab>("partners");
  const [partners, setPartners] = useState<ConnectPartnerListRow[]>([]);
  const [activities, setActivities] = useState<ConnectPartnerActivity[]>([]);
  const [analytics, setAnalytics] = useState<{ totals: Record<string, number>; byStatus: Array<{ status: string; count: number }> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editingPartner, setEditingPartner] = useState<ConnectPartner | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [partnerDetail, setPartnerDetail] = useState<{
    partner: ConnectPartner;
    buyers: ConnectPartnerBuyerRow[];
    properties: Array<{ id: string; title: string; city: string; price: number; status: string }>;
    activities: ConnectPartnerActivity[];
    analytics: ConnectPartnerAnalytics;
  } | null>(null);

  const loadPartners = useCallback(async () => {
    const res = await fetch("/api/admin/connect/partners");
    if (res.ok) {
      const data = await res.json();
      setPartners(data.partners ?? []);
    }
    setLoading(false);
  }, []);

  const loadActivities = useCallback(async () => {
    const res = await fetch("/api/admin/connect/activities?limit=100");
    if (res.ok) {
      const data = await res.json();
      setActivities(data.activities ?? []);
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    const res = await fetch("/api/admin/connect/analytics");
    if (res.ok) {
      const data = await res.json();
      setAnalytics(data);
    }
  }, []);

  const loadPartnerDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/connect/partners/${id}`);
    if (res.ok) {
      const data = await res.json();
      setPartnerDetail(data);
    }
  }, []);

  useEffect(() => {
    loadPartners();
  }, [loadPartners]);

  useEffect(() => {
    if (subTab === "activities") loadActivities();
    if (subTab === "analytics") loadAnalytics();
  }, [subTab, loadActivities, loadAnalytics]);

  useEffect(() => {
    if (selectedPartnerId) loadPartnerDetail(selectedPartnerId);
  }, [selectedPartnerId, loadPartnerDetail]);

  const filteredPartners = useMemo(() => {
    const q = searchQ.toLowerCase();
    return partners.filter((p) => {
      const matchesSearch =
        !q ||
        p.company_name.toLowerCase().includes(q) ||
        p.manager_name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.phone.includes(q);
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [partners, searchQ, statusFilter]);

  if (selectedPartnerId && partnerDetail) {
    return (
      <>
        <PartnerProfileView
          partner={partnerDetail.partner}
          buyers={partnerDetail.buyers}
          properties={partnerDetail.properties}
          activities={partnerDetail.activities}
          analytics={partnerDetail.analytics}
          onBack={() => {
            setSelectedPartnerId(null);
            setPartnerDetail(null);
            loadPartners();
          }}
          onRefresh={() => loadPartnerDetail(selectedPartnerId)}
          onEdit={() => setEditingPartner(partnerDetail.partner)}
        />
        <PartnerFormModal
          open={Boolean(editingPartner)}
          mode="edit"
          partner={editingPartner}
          onClose={() => setEditingPartner(null)}
          onSaved={() => {
            setEditingPartner(null);
            if (selectedPartnerId) void loadPartnerDetail(selectedPartnerId);
            void loadPartners();
          }}
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading-primary">AreaIQ Connect</h1>
          <p className="mt-1 text-sm text-muted">Partner CRM — manage Connect partners, assignments, and activity</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
          style={{ backgroundColor: EMERALD }}
        >
          + Add Builder
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setSubTab(tab.key)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              subTab === tab.key
                ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                : "bg-white text-body ring-1 ring-neutral-200 hover:bg-neutral-50"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
        </div>
      ) : null}

      {subTab === "partners" && !loading ? (
        <>
          <div className="flex flex-wrap gap-3">
            <input
              placeholder="Search partners..."
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              className="w-full max-w-xs rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50">
                  <tr>
                    {["Company", "Manager", "Email", "Phone", "Status", "Projects", "Listings", "Buyers", "Created", "Last Activity"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-label">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredPartners.map((p) => (
                    <tr
                      key={p.id}
                      className="cursor-pointer border-b border-neutral-100 hover:bg-neutral-50/80"
                      onClick={() => setSelectedPartnerId(p.id)}
                    >
                      <td className="px-4 py-3 font-medium text-heading-primary">{p.company_name}</td>
                      <td className="px-4 py-3 text-body">{p.manager_name}</td>
                      <td className="px-4 py-3 text-body">{p.email}</td>
                      <td className="px-4 py-3 text-body">{p.phone}</td>
                      <td className="px-4 py-3"><PartnerStatusBadge status={p.status} /></td>
                      <td className="px-4 py-3 text-body">{p.project_count}</td>
                      <td className="px-4 py-3 text-body">{p.listing_count}</td>
                      <td className="px-4 py-3 text-body">{p.assigned_buyers}</td>
                      <td className="px-4 py-3 text-muted">{formatDate(p.created_at)}</td>
                      <td className="px-4 py-3 text-muted">{formatDate(p.last_activity_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredPartners.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted">No partners found. Create your first Connect partner.</p>
            ) : null}
          </div>
        </>
      ) : null}

      {subTab === "analytics" && analytics ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Partners", value: analytics.totals.partners },
            { label: "Active Partners", value: analytics.totals.activePartners },
            { label: "Assigned Buyers", value: analytics.totals.buyers },
            { label: "Partner Listings", value: analytics.totals.listings },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <p className="text-3xl font-bold text-heading-primary">{card.value}</p>
              <p className="mt-1 text-sm text-muted">{card.label}</p>
            </div>
          ))}
          <div className="col-span-full rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-semibold text-heading-primary">Partners by Status</h3>
            <div className="grid gap-3 sm:grid-cols-4">
              {analytics.byStatus.map((s) => (
                <div key={s.status} className="rounded-xl bg-neutral-50 px-4 py-3 text-center">
                  <p className="text-2xl font-bold text-heading-primary">{s.count}</p>
                  <p className="mt-1 text-xs capitalize text-muted">{s.status}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {subTab === "activities" ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <ConnectPartnerActivityTimeline activities={activities} maxItems={50} />
        </div>
      ) : null}

      {subTab === "buyers" ? (
        <AdminConnectBuyersTab partners={partners} />
      ) : null}

      {subTab === "properties" ? (
        <AdminConnectPropertiesTab partners={partners} />
      ) : null}

      <PartnerFormModal
        open={showCreate}
        mode="create"
        onClose={() => setShowCreate(false)}
        onSaved={() => {
          void loadPartners();
          setShowCreate(false);
        }}
      />
    </div>
  );
}

function AdminConnectBuyersTab({ partners }: { partners: ConnectPartnerListRow[] }) {
  const [buyers, setBuyers] = useState<Array<ConnectPartnerBuyerRow & { partner_name?: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const results: Array<ConnectPartnerBuyerRow & { partner_name?: string }> = [];
      for (const p of partners) {
        const res = await fetch(`/api/admin/connect/partners/${p.id}`);
        if (res.ok) {
          const data = await res.json();
          for (const b of data.buyers ?? []) {
            results.push({ ...b, partner_name: p.company_name });
          }
        }
      }
      setBuyers(results);
      setLoading(false);
    })();
  }, [partners]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
      </div>
    );
  }

  if (buyers.length === 0) {
    return <p className="py-12 text-center text-sm text-muted">No assigned buyers across partners.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {buyers.map((b) => (
        <div key={b.id} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-heading-primary">{b.full_name ?? "Buyer"}</p>
            <LeadTemperatureBadge temperature={b.lead_temperature} />
          </div>
          <p className="mt-1 text-xs text-muted">{b.phone}</p>
          <p className="mt-2 text-xs text-emerald-700">{formatBudget(b.budget_min, b.budget_max)}</p>
          <p className="mt-2 text-xs text-muted">Partner: {b.partner_name ?? "—"}</p>
        </div>
      ))}
    </div>
  );
}

function AdminConnectPropertiesTab({ partners }: { partners: ConnectPartnerListRow[] }) {
  const [properties, setProperties] = useState<Array<{ id: string; title: string; city: string; status: string; partner_name?: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const results: Array<{ id: string; title: string; city: string; status: string; partner_name?: string }> = [];
      for (const p of partners) {
        const res = await fetch(`/api/admin/connect/partners/${p.id}`);
        if (res.ok) {
          const data = await res.json();
          for (const prop of data.properties ?? []) {
            results.push({ ...prop, partner_name: p.company_name });
          }
        }
      }
      setProperties(results);
      setLoading(false);
    })();
  }, [partners]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
      </div>
    );
  }

  if (properties.length === 0) {
    return <p className="py-12 text-center text-sm text-muted">No assigned properties across partners.</p>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50">
          <tr>
            {["Property", "City", "Status", "Partner"].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-label">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {properties.map((p) => (
            <tr key={p.id} className="border-b border-neutral-100">
              <td className="px-4 py-3 font-medium text-heading-primary">{p.title}</td>
              <td className="px-4 py-3 text-body">{p.city}</td>
              <td className="px-4 py-3 capitalize text-body">{p.status}</td>
              <td className="px-4 py-3 text-body">{p.partner_name ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
