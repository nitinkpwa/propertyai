"use client";



import { useEffect, useMemo, useState } from "react";

import {

  fetchAllCrmLeads,

  fetchConnectPartners,

  fetchLeadActivities,

  fetchAdminBuyerJourney,

} from "@/lib/crm/queries";

import type { CrmLeadActivity, SellerCrmLeadRow, SiteVisitDetail } from "@/lib/crm/types";

import ActivityTimeline from "@/components/crm/ActivityTimeline";

import LeadStatusBadge from "@/components/crm/LeadStatusBadge";

import LeadTemperatureBadge from "@/components/premium/LeadTemperatureBadge";

import ProfileCompletionRing from "@/components/premium/ProfileCompletionRing";

import BuyerProfileGrid from "@/components/crm/BuyerProfileGrid";

import { calculateLeadScore } from "@/lib/crm/leadScore";

import { getInitials } from "@/lib/auth/profile";



export default function AdminCrmPanel() {

  const [leads, setLeads] = useState<SellerCrmLeadRow[]>([]);

  const [partners, setPartners] = useState<Array<{ id: string; full_name: string | null }>>([]);

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

        <p className="text-sm text-neutral-500">No CRM leads yet.</p>

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

            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-xl font-bold text-white">

              {getInitials(detailBuyer?.full_name)}

            </div>

            <div className="flex-1">

              <div className="flex flex-wrap items-center gap-2">

                <h2 className="text-2xl font-bold text-neutral-900">

                  {detailBuyer?.full_name ?? "Buyer"}

                </h2>

                <LeadTemperatureBadge temperature={score.temperature} score={score.score} />

                <LeadStatusBadge status={selected.status} />

              </div>

              <p className="mt-1 text-sm text-neutral-500">

                {detailBuyer?.phone}

                {detailBuyer?.email ? ` · ${detailBuyer.email}` : ""}

              </p>

            </div>

            <ProfileCompletionRing percent={detailBuyer?.profile_completion ?? 0} size="md" />

          </div>



          <BuyerProfileGrid buyer={detailBuyer} className="mt-6" />

        </div>



        <div className="grid gap-6 lg:grid-cols-2">

          <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">

            <h3 className="font-semibold text-neutral-900">Site Visits</h3>

            <ul className="mt-3 space-y-2 text-sm">

              {(journey?.siteVisits ?? []).length === 0 ? (

                <li className="text-neutral-500">No visits</li>

              ) : (

                journey?.siteVisits?.map((v: SiteVisitDetail) => (

                  <li key={String(v.id)} className="rounded-xl bg-neutral-50 px-3 py-2">

                    {(v.property as { title?: string })?.title ?? "Property"} — {String(v.visit_date)} · {String(v.status)}

                  </li>

                ))

              )}

            </ul>

          </section>



          <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">

            <h3 className="font-semibold text-neutral-900">AI Conversations</h3>

            <ul className="mt-3 space-y-2 text-sm">

              {(journey?.conversations ?? []).length === 0 ? (

                <li className="text-neutral-500">No chats</li>

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

            <h3 className="mb-4 font-semibold text-neutral-900">Buyer Journey Timeline</h3>

            <ActivityTimeline activities={activities} maxItems={15} />

          </section>



          <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm lg:col-span-2">

            <h3 className="mb-3 font-semibold text-neutral-900">Assign Connect Partner</h3>

            <select

              className="w-full max-w-xs rounded-xl border border-neutral-200 px-3 py-2.5 text-sm"

              defaultValue={selected.assigned_connect_id ?? ""}

              onChange={(e) => {

                if (e.target.value) handleAssign(e.target.value);

              }}

              disabled={assigning}

            >

              <option value="">Select partner…</option>

              {partners.map((p) => (

                <option key={p.id} value={p.id}>

                  {p.full_name ?? p.id.slice(0, 8)}

                </option>

              ))}

            </select>

          </section>

        </div>

      </div>

    );

  }



  return (

    <div className="space-y-6">

      <div>

        <h2 className="text-xl font-bold text-neutral-900">CRM — Lead Pipeline</h2>

        <p className="mt-1 text-sm text-neutral-500">

          Click a lead to open the full buyer intelligence view

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

              <div className="flex items-center justify-between gap-2">

                <p className="font-bold text-neutral-900">{buyer?.full_name ?? "Buyer"}</p>

                <LeadTemperatureBadge temperature={score.temperature} />

              </div>

              <p className="mt-1 text-xs text-neutral-500">{buyer?.phone ?? buyer?.email ?? ""}</p>

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

