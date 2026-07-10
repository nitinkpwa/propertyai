"use client";

import { useEffect, useMemo, useState } from "react";
import AdminProfileCard, { AdminProfileInline } from "@/components/admin/AdminProfileCard";
import { resolveProfileDisplay } from "@/lib/admin/profileDisplay";
import ActivityTimeline from "@/components/crm/ActivityTimeline";
import BuyerProfileGrid from "@/components/crm/BuyerProfileGrid";
import LeadStatusBadge from "@/components/crm/LeadStatusBadge";
import LeadTemperatureBadge from "@/components/premium/LeadTemperatureBadge";
import ProfileCompletionRing from "@/components/premium/ProfileCompletionRing";
import { calculateLeadScore } from "@/lib/crm/leadScore";
import {
  fetchAdminBuyerJourney,
  fetchAllCrmLeads,
  fetchConnectPartners,
  fetchLeadActivities,
} from "@/lib/crm/queries";
import type { CrmLeadActivity, SellerCrmLeadRow, SiteVisitDetail } from "@/lib/crm/types";
import type { Profile } from "@/lib/supabase";

interface AdminCrmPanelProps {
  profileLookup?: Map<string, Profile>;
}

export default function AdminCrmPanel({ profileLookup }: AdminCrmPanelProps) {
  const [leads, setLeads] = useState<SellerCrmLeadRow[]>([]);
  const [partners, setPartners] = useState<
    Array<{
      id: string;
      full_name: string | null;
      email: string | null;
      phone: string | null;
      role: string | null;
      company: string | null;
      created_at: string | null;
    }>
  >([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [activities, setActivities] = useState<CrmLeadActivity[]>([]);
  const [journey, setJourney] = useState<Awaited<ReturnType<typeof fetchAdminBuyerJourney>>>(null);
  const [assigning, setAssigning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "detail">("list");

  const load = async () => {
    const [allLeads, allPartners] = await Promise.all([
      fetchAllCrmLeads(),
      fetchConnectPartners(),
    ]);
    setLeads(allLeads);
    setPartners(allPartners);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const selected = leads.find((l) => l.id === selectedLeadId);

  const detailBuyer = useMemo(() => {
    if (journey?.profile?.id) return journey.profile;
    return selected?.buyer ?? null;
  }, [journey, selected]);

  const assignedPartner = useMemo(() => {
    if (!selected?.assigned_connect_id) return null;
    return partners.find((p) => p.id === selected.assigned_connect_id) ?? null;
  }, [partners, selected?.assigned_connect_id]);

  useEffect(() => {
    if (!selectedLeadId || !selected?.buyer_id) return;
    fetchLeadActivities(selectedLeadId, 30).then((acts) => setActivities(acts.reverse()));
    fetchAdminBuyerJourney(selected.buyer_id).then(setJourney);
  }, [selectedLeadId, selected?.buyer_id]);

  const handleAssign = async (connectPartnerId: string) => {
    if (!selectedLeadId) return;
    setAssigning(true);
    const res = await fetch("/api/crm/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: selectedLeadId, connectPartnerId }),
    });
    setAssigning(false);
    if (res.ok) await load();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-neutral-200 bg-white py-16 text-center">
        <p className="text-sm text-muted">No CRM leads yet.</p>
      </div>
    );
  }

  if (view === "detail" && selected) {
    const score = calculateLeadScore({
      profile: detailBuyer ?? undefined,
      savedCount: journey?.savedProperties?.length ?? 0,
      chatCount: journey?.conversations?.length ?? 0,
      visitCount: journey?.siteVisits?.length ?? 0,
    });

    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => setView("list")}
          className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
        >
          ← Back to all leads
        </button>

        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start gap-5">
            <AdminProfileCard
              profile={{ ...(detailBuyer ?? {}), role: "buyer" }}
              profileId={selected.buyer_id}
              lookup={profileLookup}
              status={selected.status}
              subtitle="CRM lead"
              className="flex-1 border-0 bg-transparent p-0"
            />
            <div className="flex flex-col items-end gap-3">
              <LeadTemperatureBadge temperature={score.temperature} score={score.score} />
              <LeadStatusBadge status={selected.status} />
              <ProfileCompletionRing percent={detailBuyer?.profile_completion ?? 0} size="md" />
            </div>
          </div>

          <BuyerProfileGrid buyer={detailBuyer} className="mt-6" />
        </div>

        {assignedPartner ? (
          <AdminProfileCard
            profile={{ ...assignedPartner, role: assignedPartner.role ?? "builder" }}
            lookup={profileLookup}
            subtitle="Assigned Connect partner"
          />
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-heading-primary">Site Visits</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {(journey?.siteVisits ?? []).length === 0 ? (
                <li className="text-muted">No visits</li>
              ) : (
                journey?.siteVisits?.map((v: SiteVisitDetail) => (
                  <li key={String(v.id)} className="rounded-xl bg-neutral-50 px-3 py-2">
                    {(v.property as { title?: string })?.title ?? "—"} — {String(v.visit_date)} ·{" "}
                    {String(v.status)}
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-heading-primary">AI Conversations</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {(journey?.conversations ?? []).length === 0 ? (
                <li className="text-muted">No chats</li>
              ) : (
                journey?.conversations?.map((c: { id: string; title: string; messageCount: number }) => (
                  <li key={c.id} className="rounded-xl bg-neutral-50 px-3 py-2">
                    {c.title} · {c.messageCount} messages
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h3 className="mb-4 font-semibold text-heading-primary">Buyer Journey Timeline</h3>
            <ActivityTimeline activities={activities} maxItems={15} />
          </section>

          <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h3 className="mb-3 font-semibold text-heading-primary">Assign Connect Partner</h3>
            <select
              className="w-full max-w-xs rounded-xl border border-neutral-200 px-3 py-2.5 text-sm"
              defaultValue={selected.assigned_connect_id ?? ""}
              onChange={(e) => {
                if (e.target.value) handleAssign(e.target.value);
              }}
              disabled={assigning}
            >
              <option value="">Select partner…</option>
              {partners.map((p) => {
                const resolved = resolveProfileDisplay(p, { profileId: p.id, lookup: profileLookup });
                return (
                  <option key={p.id} value={p.id}>
                    {resolved.displayName}
                  </option>
                );
              })}
            </select>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-heading-primary">CRM — Buyers</h2>
        <p className="mt-1 text-sm text-muted">
          Assign connect partners and review buyer CRM records
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {leads.map((lead) => {
          const buyer = lead.buyer;
          const score = calculateLeadScore({ profile: buyer ?? undefined });

          return (
            <button
              key={lead.id}
              type="button"
              onClick={() => {
                setSelectedLeadId(lead.id);
                setView("detail");
              }}
              className="rounded-3xl border border-neutral-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <AdminProfileInline
                  profile={{ ...(buyer ?? {}), role: "buyer" }}
                  profileId={lead.buyer_id}
                  lookup={profileLookup}
                />
                <LeadTemperatureBadge temperature={score.temperature} />
              </div>
              {buyer?.budgetLabel ? (
                <p className="mt-2 text-xs font-medium text-emerald-700">{buyer.budgetLabel}</p>
              ) : null}
              <div className="mt-3">
                <LeadStatusBadge status={lead.status} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
