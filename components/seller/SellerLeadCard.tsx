"use client";

import Link from "next/link";
import LeadTemperatureBadge from "@/components/premium/LeadTemperatureBadge";
import LeadStatusBadge from "@/components/crm/LeadStatusBadge";
import ActivityTimeline from "@/components/crm/ActivityTimeline";
import BuyerProfileGrid from "@/components/crm/BuyerProfileGrid";
import { calculateLeadScore } from "@/lib/crm/leadScore";
import type { CrmLeadActivity, SellerCrmLeadRow } from "@/lib/crm/types";
import { getInitials } from "@/lib/auth/profile";

interface Props {
  lead: SellerCrmLeadRow;
  activities: CrmLeadActivity[];
  expanded: boolean;
  onToggle: () => void;
  engagement?: { saved: number; viewed: number; chats: number; visits: number };
}

export default function SellerLeadCard({
  lead,
  activities,
  expanded,
  onToggle,
  engagement = { saved: 0, viewed: 0, chats: 0, visits: 0 },
}: Props) {
  const buyer = lead.buyer;
  const score = calculateLeadScore({
    profile: buyer ?? undefined,
    savedCount: engagement.saved,
    chatCount: engagement.chats,
    visitCount: engagement.visits,
  });

  const initials = getInitials(buyer?.full_name);
  const phone = buyer?.phone;
  const wa = phone?.replace(/\D/g, "");

  return (
    <article className="overflow-hidden rounded-3xl border border-neutral-200/80 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-lg font-bold text-white shadow-lg shadow-emerald-200">
            {initials || "B"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-heading-primary">
                {buyer?.full_name ?? buyer?.email ?? "Buyer"}
              </h3>
              <LeadTemperatureBadge temperature={score.temperature} score={score.score} />
              <LeadStatusBadge status={lead.status} />
            </div>
            <p className="mt-1 text-sm text-muted">
              {phone ? `📞 ${phone}` : ""}
              {buyer?.email ? ` · ✉ ${buyer.email}` : ""}
            </p>
            <p className="mt-2 text-sm font-medium text-emerald-700">
              {lead.propertyTitle ?? "Property interest pending"}
            </p>
            <span className="mt-1 inline-block rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-semibold text-body">
              Source: {lead.leadSource ?? "CRM"}
            </span>
          </div>
        </div>

        <BuyerProfileGrid buyer={buyer} className="mt-5" />

        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
          <span>❤️ {engagement.saved} saved</span>
          <span>👀 {engagement.viewed} viewed</span>
          <span>🤖 {engagement.chats} AI chats</span>
          <span>📅 {engagement.visits} visits</span>
          {lead.recentActivity ? (
            <span className="text-muted">
              Last: {lead.recentActivity.title}
            </span>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {phone ? (
            <>
              <a
                href={`tel:${phone}`}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                Call
              </a>
              {wa ? (
                <a
                  href={`https://wa.me/91${wa}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
                >
                  WhatsApp
                </a>
              ) : null}
            </>
          ) : null}
          <button
            type="button"
            onClick={onToggle}
            className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold text-body hover:bg-neutral-50"
          >
            {expanded ? "Hide Journey" : "Expand CRM Journey"}
          </button>
          {lead.siteVisitId ? (
            <Link
              href="/seller"
              className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold text-body hover:bg-neutral-50"
            >
              Manage Visit
            </Link>
          ) : null}
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-neutral-100 bg-neutral-50/50 px-5 py-5 sm:px-6">
          <h4 className="mb-3 text-sm font-semibold text-heading-secondary">Buyer Journey</h4>
          <ActivityTimeline activities={activities} maxItems={12} />
        </div>
      ) : null}
    </article>
  );
}
