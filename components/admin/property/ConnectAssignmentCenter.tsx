"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useActiveConnectPartners } from "@/lib/connect/partners/useActiveConnectPartners";
import type { ConnectPartnerAnalytics } from "@/lib/connect/partners/types";
import type { ConnectPartner } from "@/lib/supabase";
import type { AdminPropertyFormState } from "@/lib/admin/property/types";
import { Field, FieldGrid, SectionHeader, TextInput } from "./ui/FormPrimitives";

interface Props {
  form: AdminPropertyFormState;
  setForm: (form: AdminPropertyFormState) => void;
  compact?: boolean;
}

interface PartnerDetailResponse {
  partner: ConnectPartner;
  analytics: ConnectPartnerAnalytics;
  activities: Array<{ id: string; description: string; created_at: string; type: string }>;
}

function formatConversion(analytics: ConnectPartnerAnalytics | null): string {
  if (!analytics || analytics.totalBuyers === 0) return "—";
  const rate = (analytics.closed / analytics.totalBuyers) * 100;
  return `${rate.toFixed(0)}%`;
}

export default function ConnectAssignmentCenter({ form, setForm, compact }: Props) {
  const { partners, loading, refresh } = useActiveConnectPartners();
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<PartnerDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createForm, setCreateForm] = useState({
    companyName: "",
    managerName: "",
    phone: "",
    email: "",
    password: "",
  });

  const filteredPartners = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return partners;
    return partners.filter(
      (p) =>
        p.company_name.toLowerCase().includes(q) ||
        p.manager_name.toLowerCase().includes(q) ||
        (p.email?.toLowerCase().includes(q) ?? false),
    );
  }, [partners, search]);

  const selectedPartner = detail?.partner ?? partners.find((p) => p.id === form.connect_partner_id) ?? null;

  const loadPartnerDetail = useCallback(async (partnerId: string) => {
    if (!partnerId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/connect/partners/${partnerId}`);
      if (!res.ok) throw new Error("Failed to load partner");
      const data = (await res.json()) as PartnerDetailResponse;
      setDetail(data);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPartnerDetail(form.connect_partner_id);
  }, [form.connect_partner_id, loadPartnerDetail]);

  const assignPartner = (partnerId: string) => {
    setForm({ ...form, connect_partner_id: partnerId });
  };

  const handleQuickCreate = async () => {
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/admin/connect/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create partner");
      const newId = data.partnerId as string | undefined;
      await refresh();
      if (newId) assignPartner(newId);
      setShowCreate(false);
      setCreateForm({ companyName: "", managerName: "", phone: "", email: "", password: "" });
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to create partner");
    } finally {
      setCreating(false);
    }
  };

  const analytics = detail?.analytics ?? null;
  const recentActivity = detail?.activities?.slice(0, 5) ?? [];

  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      {!compact ? (
        <SectionHeader
          title="Assigned Connect Partner"
          description="One property → one partner. That partner manages every buyer inquiry for this listing."
        />
      ) : null}

      <FieldGrid>
        <Field label="Search partners" span={2}>
          <TextInput value={search} onChange={setSearch} placeholder="Search by company, manager or email..." />
        </Field>
        <Field label="Assigned Connect Partner" span={2}>
          <select
            className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            value={form.connect_partner_id}
            disabled={loading}
            onChange={(e) => assignPartner(e.target.value)}
          >
            <option value="">{loading ? "Loading partners…" : "— No partner assigned —"}</option>
            {filteredPartners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.company_name} · {p.manager_name}
              </option>
            ))}
          </select>
        </Field>
      </FieldGrid>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
        >
          {showCreate ? "Cancel" : "+ Quick Create Partner"}
        </button>
        {form.connect_partner_id ? (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Synced to Connect CRM
          </span>
        ) : null}
      </div>

      {showCreate ? (
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50/50 p-4">
          <p className="mb-3 text-sm font-semibold text-heading-primary">Quick Create Partner</p>
          <FieldGrid cols={2}>
            <Field label="Company Name"><TextInput value={createForm.companyName} onChange={(v) => setCreateForm({ ...createForm, companyName: v })} /></Field>
            <Field label="Manager Name"><TextInput value={createForm.managerName} onChange={(v) => setCreateForm({ ...createForm, managerName: v })} /></Field>
            <Field label="Phone"><TextInput value={createForm.phone} onChange={(v) => setCreateForm({ ...createForm, phone: v })} /></Field>
            <Field label="Email"><TextInput value={createForm.email} onChange={(v) => setCreateForm({ ...createForm, email: v })} /></Field>
            <Field label="Password" span={2}><TextInput value={createForm.password} onChange={(v) => setCreateForm({ ...createForm, password: v })} type="password" /></Field>
          </FieldGrid>
          {createError ? <p className="mt-2 text-sm text-red-600">{createError}</p> : null}
          <button
            type="button"
            disabled={creating}
            onClick={() => void handleQuickCreate()}
            className="mt-3 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {creating ? "Creating…" : "Create & Assign"}
          </button>
        </div>
      ) : null}

      {selectedPartner ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-label">Partner Profile</p>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-lg font-bold text-heading-primary">{selectedPartner.company_name}</p>
              <p className="text-sm text-body">{selectedPartner.manager_name}</p>
              <p className="mt-1 text-xs text-muted">{selectedPartner.email} · {selectedPartner.phone}</p>
              {selectedPartner.city ? <p className="text-xs text-muted">{selectedPartner.city}</p> : null}
            </div>
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold capitalize text-body">
              {selectedPartner.status}
            </span>
          </div>
        </div>
      ) : null}

      {detailLoading ? (
        <p className="text-sm text-muted">Loading partner statistics…</p>
      ) : analytics ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["Listings", String(analytics.listings)],
            ["Active Buyers", String(analytics.totalBuyers)],
            ["Conversion", formatConversion(analytics)],
            ["Response Time", analytics.responseTimeHours != null ? `${analytics.responseTimeHours}h` : "—"],
            ["Site Visits", String(analytics.visitsScheduled)],
            ["Revenue", "—"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-neutral-100 bg-neutral-50 p-3 text-center">
              <p className="text-lg font-bold text-heading-primary">{value}</p>
              <p className="text-[11px] text-muted">{label}</p>
            </div>
          ))}
        </div>
      ) : form.connect_partner_id ? (
        <p className="text-sm text-muted">Partner statistics unavailable.</p>
      ) : null}

      {recentActivity.length > 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-label">Recent Activity</p>
          <ul className="mt-3 space-y-2">
            {recentActivity.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 border-b border-neutral-50 pb-2 text-sm last:border-0">
                <span className="text-body">{item.description}</span>
                <span className="shrink-0 text-[11px] text-muted">
                  {new Date(item.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
