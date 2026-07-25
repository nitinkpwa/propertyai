"use client";

import Link from "next/link";
import { formatDate, formatDateTime } from "@/lib/admin/constants";
import type { AdminLeadSummary } from "@/lib/admin/leads/types";
import { temperatureLabel, temperatureStyles } from "@/lib/crm/leadScore";

function displayValue(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed || "—";
}

function AvatarCell({ lead }: { lead: AdminLeadSummary }) {
  if (lead.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={lead.avatarUrl}
        alt=""
        className="h-9 w-9 rounded-full object-cover ring-2 ring-white"
      />
    );
  }

  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white">
      {lead.initials}
    </div>
  );
}

export default function LeadTable({ leads }: { leads: AdminLeadSummary[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="admin-data-table w-full min-w-[1100px] table-fixed text-left text-sm">
          <colgroup>
            <col className="w-[6%]" />
            <col className="w-[14%]" />
            <col className="w-[11%]" />
            <col className="w-[16%]" />
            <col className="w-[10%]" />
            <col className="w-[12%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[9%]" />
            <col className="w-[7%]" />
            <col className="w-[5%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50/80 text-[11px] font-semibold uppercase tracking-wider text-muted">
              <th className="whitespace-nowrap px-4 py-3">Avatar</th>
              <th className="whitespace-nowrap px-4 py-3">Name</th>
              <th className="whitespace-nowrap px-4 py-3">Phone</th>
              <th className="whitespace-nowrap px-4 py-3">Email</th>
              <th className="whitespace-nowrap px-4 py-3">Budget</th>
              <th className="whitespace-nowrap px-4 py-3">Preferred Location</th>
              <th className="whitespace-nowrap px-4 py-3">Property Type</th>
              <th className="whitespace-nowrap px-4 py-3">Last Activity</th>
              <th className="whitespace-nowrap px-4 py-3">Created</th>
              <th className="whitespace-nowrap px-4 py-3">Status</th>
              <th className="whitespace-nowrap px-4 py-3">AI Score</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead.buyerId}
                className="border-b border-neutral-100 transition hover:bg-emerald-50/40"
              >
                <td className="px-4 py-3">
                  <Link href={`/admin/leads/${lead.buyerId}`} className="inline-flex">
                    <AvatarCell lead={lead} />
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/leads/${lead.buyerId}`}
                    className="font-semibold text-heading-primary hover:text-emerald-700"
                  >
                    {lead.displayName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-body">{displayValue(lead.phone)}</td>
                <td className="max-w-[180px] truncate px-4 py-3 text-body">
                  {displayValue(lead.email)}
                </td>
                <td className="px-4 py-3 text-body">{displayValue(lead.budget === "—" ? null : lead.budget)}</td>
                <td className="max-w-[160px] truncate px-4 py-3 text-body">
                  {displayValue(lead.interestedLocation === "—" ? null : lead.interestedLocation)}
                </td>
                <td className="px-4 py-3 text-body">
                  {displayValue(lead.propertyType === "—" ? null : lead.propertyType)}
                </td>
                <td className="px-4 py-3 text-body">
                  {lead.lastActivityAt
                    ? formatDateTime(lead.lastActivityAt)
                    : displayValue(lead.lastActivity)}
                </td>
                <td className="px-4 py-3 text-body">{formatDate(lead.createdAt)}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-body">
                    {lead.stage}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${temperatureStyles(lead.leadScore.temperature)}`}
                  >
                    {temperatureLabel(lead.leadScore.temperature)} · {lead.leadScore.score}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
