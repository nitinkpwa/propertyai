"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AdminPropertyMiniGrid from "@/components/admin/leads/AdminPropertyMiniGrid";
import { formatDate, formatDateTime, formatPrice } from "@/lib/admin/constants";
import { mapUrgency, mapPropertyEmbedsFromSaved, mapPropertyEmbedsFromViews } from "@/lib/admin/leads/mappers";
import type { AdminLeadProfile } from "@/lib/admin/leads/types";
import { labelForPurpose, labelForTimeline } from "@/lib/buyer/profileFields";
import { temperatureLabel } from "@/lib/crm/leadScore";

const EMPTY = "No information collected yet.";

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function FieldGrid({ items }: { items: Array<{ label: string; value: string | null | undefined }> }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-label">{item.label}</p>
          <p className="mt-1 text-sm font-medium text-heading-primary">{item.value?.trim() || EMPTY}</p>
        </div>
      ))}
    </div>
  );
}

function EmptyBlock() {
  return <p className="rounded-xl bg-neutral-50 px-4 py-8 text-center text-sm text-muted">{EMPTY}</p>;
}

function purposeFlags(buyer: AdminLeadProfile["buyer"]) {
  const purpose = buyer?.buying_purpose;
  return {
    investment: purpose === "investment" || purpose === "rental_income" ? "Yes" : purpose ? "No" : null,
    selfUse: purpose === "self" || purpose === "family" ? "Yes" : purpose ? "No" : null,
    rental: purpose === "rental_income" ? "Yes" : purpose ? "No" : null,
  };
}

function propertyGrid(properties: ReturnType<typeof mapPropertyEmbedsFromSaved>) {
  if (properties.length === 0) return <EmptyBlock />;
  return <AdminPropertyMiniGrid properties={properties} />;
}

export default function LeadProfileView({
  lead,
  onRefresh,
}: {
  lead: AdminLeadProfile;
  onRefresh?: () => void;
}) {
  const [chatQuery, setChatQuery] = useState("");
  const [noteDraft, setNoteDraft] = useState(lead.buyerNotes ?? "");
  const [saving, setSaving] = useState(false);

  const allChatsChronological = useMemo(() => {
    const sorted = [...lead.conversations].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    return sorted.flatMap((chat) =>
      chat.messages.map((msg, idx) => ({
        id: `${chat.id}-${idx}`,
        chatTitle: chat.title,
        at: msg.timestamp ?? chat.updated_at,
        role: msg.role,
        content: msg.content,
      })),
    );
  }, [lead.conversations]);

  const filteredChronological = useMemo(() => {
    const q = chatQuery.trim().toLowerCase();
    if (!q) return allChatsChronological;
    return allChatsChronological.filter(
      (m) => `${m.chatTitle} ${m.content}`.toLowerCase().includes(q),
    );
  }, [allChatsChronological, chatQuery]);

  const viewedProperties = useMemo(
    () => mapPropertyEmbedsFromViews(lead.propertyViews),
    [lead.propertyViews],
  );

  const savedProperties = useMemo(
    () =>
      mapPropertyEmbedsFromSaved(
        lead.savedProperties.map((s) => ({
          property_id: s.property_id,
          property: s.property ?? null,
        })),
      ),
    [lead.savedProperties],
  );

  const saveNote = async () => {
    setSaving(true);
    await fetch(`/api/admin/leads/${lead.buyerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buyerNotes: noteDraft }),
    });
    setSaving(false);
    onRefresh?.();
  };

  const exportProfile = () => {
    const sections = [
      `# Buyer Profile — ${lead.displayName}`,
      "",
      "## Buyer Summary",
      `Name: ${lead.displayName}`,
      `Phone: ${lead.buyer?.phone ?? EMPTY}`,
      `Email: ${lead.buyer?.email ?? EMPTY}`,
      `Status: ${lead.stage}`,
      `Source: ${lead.source}`,
      "",
      "## Property Requirements",
      `Budget: ${lead.budget}`,
      `Locations: ${lead.interestedLocation}`,
      "",
      "## AI Conversation Summary",
      lead.aiSummary ?? EMPTY,
      "",
      "## CRM Notes",
      lead.buyerNotes ?? EMPTY,
    ];
    const blob = new Blob([sections.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${lead.displayName.replace(/\s+/g, "-").toLowerCase()}-profile.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const whatsAppHref = lead.whatsApp
    ? `https://wa.me/91${lead.whatsApp.replace(/\D/g, "").slice(-10)}`
    : undefined;
  const callHref = lead.buyer?.phone ? `tel:${lead.buyer.phone}` : undefined;
  const emailHref = lead.buyer?.email ? `mailto:${lead.buyer.email}` : undefined;
  const purpose = purposeFlags(lead.buyer);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-6">
        <Section title="Buyer Summary">
          <div className="flex flex-wrap items-start gap-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-2xl font-bold text-white">
              {lead.initials}
            </div>
            <div className="min-w-0 flex-1">
              <FieldGrid
                items={[
                  { label: "Name", value: lead.displayName },
                  { label: "Phone", value: lead.buyer?.phone },
                  { label: "Email", value: lead.buyer?.email },
                  { label: "WhatsApp", value: lead.whatsApp },
                  { label: "Role", value: "Buyer" },
                  { label: "Signup Date", value: lead.signupDate ? formatDate(lead.signupDate) : null },
                  {
                    label: "Last Active",
                    value: lead.lastSeenAt ? formatDateTime(lead.lastSeenAt) : null,
                  },
                  {
                    label: "Lead Score",
                    value: `${temperatureLabel(lead.leadScore.temperature)} · ${lead.leadScore.score}`,
                  },
                  { label: "Current Status", value: lead.stage },
                  { label: "Source", value: lead.source },
                ]}
              />
            </div>
          </div>
        </Section>

        <Section title="Property Requirements">
          <FieldGrid
            items={[
              {
                label: "Budget Min",
                value: lead.buyer?.budget_min != null ? formatPrice(lead.buyer.budget_min) : null,
              },
              {
                label: "Budget Max",
                value: lead.buyer?.budget_max != null ? formatPrice(lead.buyer.budget_max) : null,
              },
              {
                label: "Preferred Areas",
                value: lead.interestedLocation === "—" ? null : lead.interestedLocation,
              },
              { label: "Property Type", value: lead.propertyType === "—" ? null : lead.propertyType },
              { label: "Configuration", value: lead.configuration === "—" ? null : lead.configuration },
              { label: "Purpose", value: labelForPurpose(lead.buyer?.buying_purpose) },
              { label: "Investment", value: purpose.investment },
              { label: "Self Use", value: purpose.selfUse },
              { label: "Rental", value: purpose.rental },
              {
                label: "Ready / Under Construction",
                value: lead.preferredPossession === "—" ? null : lead.preferredPossession,
              },
              {
                label: "Builder Preference",
                value: lead.connect?.full_name ?? lead.seller?.full_name ?? lead.assignedManager,
              },
              { label: "Urgency", value: mapUrgency(lead.buyer) === "—" ? null : mapUrgency(lead.buyer) },
              {
                label: "Timeline",
                value: lead.buyer?.timelineLabel || labelForTimeline(lead.buyer?.buying_timeline),
              },
            ]}
          />
        </Section>

        <Section title="AI Conversation Summary">
          {lead.aiSummary ? (
            <div className="space-y-3">
              <p className="whitespace-pre-line text-sm leading-relaxed text-body">{lead.aiSummary}</p>
              {lead.aiSummaryConfidence != null ? (
                <p className="text-xs font-semibold text-emerald-700">
                  Confidence {lead.aiSummaryConfidence}%.
                </p>
              ) : null}
            </div>
          ) : (
            <EmptyBlock />
          )}
        </Section>

        <Section title="Full AI Chat">
          <input
            value={chatQuery}
            onChange={(e) => setChatQuery(e.target.value)}
            placeholder="Search conversations…"
            className="mb-4 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm"
          />
          {filteredChronological.length === 0 ? (
            <EmptyBlock />
          ) : (
            <div className="max-h-[32rem] space-y-3 overflow-y-auto">
              {filteredChronological.map((msg) => (
                <div key={msg.id} className="rounded-xl border border-neutral-100 bg-neutral-50/80 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted">
                    <span>{msg.chatTitle}</span>
                    <span>{formatDateTime(msg.at)}</span>
                  </div>
                  <div
                    className={`rounded-xl px-3 py-2 text-sm ${msg.role === "user" ? "ml-8 bg-emerald-500 text-white" : "mr-8 bg-white text-heading-primary"}`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Buyer Journey">
          {lead.buyerJourney.length === 0 ? (
            <EmptyBlock />
          ) : (
            <ol className="space-y-4">
              {lead.buyerJourney.map((event) => (
                <li key={event.id} className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-lg">
                    {event.icon}
                  </div>
                  <div className="min-w-0 flex-1 border-b border-neutral-100 pb-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-heading-primary">{event.title}</p>
                      <p className="text-xs text-muted">{formatDateTime(event.at)}</p>
                    </div>
                    {event.description ? (
                      <p className="mt-1 text-sm text-body">{event.description}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Section>

        <Section title="Saved Properties">{propertyGrid(savedProperties)}</Section>

        <Section title="Viewed Properties">{propertyGrid(viewedProperties)}</Section>

        <Section title="Shared Properties">{propertyGrid(lead.sharedProperties)}</Section>

        <Section title="Site Visits">
          {lead.siteVisits.length === 0 ? (
            <EmptyBlock />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wider text-muted">
                    {["Project", "Date", "Status", "Feedback"].map((h) => (
                      <th key={h} className="px-3 py-2">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lead.siteVisits.map((v) => (
                    <tr key={v.id} className="border-b border-neutral-100">
                      <td className="px-3 py-3 font-medium">{v.property?.title ?? EMPTY}</td>
                      <td className="px-3 py-3">{v.visit_date}</td>
                      <td className="px-3 py-3 capitalize">{v.status.replace(/_/g, " ")}</td>
                      <td className="px-3 py-3">
                        {(v as { feedback?: { notes?: string } }).feedback?.notes ?? EMPTY}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="CRM Notes">
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            rows={5}
            placeholder="Internal notes about this buyer…"
            className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm"
          />
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-muted">Stored in buyer profile notes</p>
            <button
              type="button"
              disabled={saving}
              onClick={saveNote}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              Save Note
            </button>
          </div>
        </Section>

        <Section title="Documents">
          <EmptyBlock />
        </Section>

        <Section title="AI Insights">
          {lead.aiInsights ? (
            <FieldGrid
              items={[
                { label: "Buying Intent", value: lead.aiInsights.buyingIntent },
                { label: "Budget Confidence", value: lead.aiInsights.budgetConfidence },
                {
                  label: "Recommended Projects",
                  value:
                    lead.aiInsights.recommendedProjects.length > 0
                      ? lead.aiInsights.recommendedProjects.join(", ")
                      : null,
                },
                {
                  label: "Matching Builders",
                  value:
                    lead.aiInsights.matchingBuilders.length > 0
                      ? lead.aiInsights.matchingBuilders.join(", ")
                      : null,
                },
                {
                  label: "Probability to Buy",
                  value:
                    lead.aiInsights.probabilityToBuy != null
                      ? `${lead.aiInsights.probabilityToBuy}%`
                      : null,
                },
                { label: "Best Time to Follow Up", value: lead.aiInsights.bestTimeToFollowUp },
                { label: "Recommended Next Action", value: lead.aiInsights.recommendedNextAction },
              ]}
            />
          ) : (
            <EmptyBlock />
          )}
        </Section>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted">Actions</h2>
          <div className="space-y-2">
            {callHref ? (
              <a
                href={callHref}
                className="flex w-full items-center justify-center rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-heading-secondary hover:bg-neutral-50"
              >
                Call
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="flex w-full cursor-not-allowed items-center justify-center rounded-xl border border-neutral-100 px-4 py-2.5 text-sm font-semibold text-muted"
              >
                Call
              </button>
            )}
            {whatsAppHref ? (
              <a
                href={whatsAppHref}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
              >
                WhatsApp
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="flex w-full cursor-not-allowed items-center justify-center rounded-xl border border-neutral-100 px-4 py-2.5 text-sm font-semibold text-muted"
              >
                WhatsApp
              </button>
            )}
            {emailHref ? (
              <a
                href={emailHref}
                className="flex w-full items-center justify-center rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-heading-secondary hover:bg-neutral-50"
              >
                Email
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="flex w-full cursor-not-allowed items-center justify-center rounded-xl border border-neutral-100 px-4 py-2.5 text-sm font-semibold text-muted"
              >
                Email
              </button>
            )}
            <Link
              href="/admin?tab=crm"
              className="flex w-full items-center justify-center rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-heading-secondary hover:bg-neutral-50"
            >
              Assign Builder
            </Link>
            <Link
              href="/admin?tab=visits"
              className="flex w-full items-center justify-center rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-heading-secondary hover:bg-neutral-50"
            >
              Schedule Visit
            </Link>
            <button
              type="button"
              onClick={saveNote}
              disabled={saving}
              className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-heading-secondary hover:bg-neutral-50 disabled:opacity-60"
            >
              Add Note
            </button>
            <Link
              href="/admin?tab=properties"
              className="flex w-full items-center justify-center rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-heading-secondary hover:bg-neutral-50"
            >
              Share Property
            </Link>
            <button
              type="button"
              onClick={exportProfile}
              className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-heading-secondary hover:bg-neutral-50"
            >
              Export PDF
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">Engagement</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-neutral-50 px-3 py-2">
              <p className="text-xs text-muted">Saved</p>
              <p className="font-bold">{lead.counts.savedProperties}</p>
            </div>
            <div className="rounded-xl bg-neutral-50 px-3 py-2">
              <p className="text-xs text-muted">Visits</p>
              <p className="font-bold">{lead.counts.siteVisits}</p>
            </div>
            <div className="rounded-xl bg-neutral-50 px-3 py-2">
              <p className="text-xs text-muted">Chats</p>
              <p className="font-bold">{lead.counts.conversations}</p>
            </div>
            <div className="rounded-xl bg-neutral-50 px-3 py-2">
              <p className="text-xs text-muted">Views</p>
              <p className="font-bold">{lead.counts.propertyViews}</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
