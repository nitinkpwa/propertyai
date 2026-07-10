import { LEAD_STATUS_LABELS } from "@/lib/crm/constants";
import type { LeadStatus } from "@/lib/crm/types";

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: "bg-blue-50 text-blue-700 ring-blue-100",
  ai_qualified: "bg-violet-50 text-violet-700 ring-violet-100",
  interested: "bg-amber-50 text-amber-700 ring-amber-100",
  property_suggested: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  property_saved: "bg-rose-50 text-rose-700 ring-rose-100",
  inquiry_sent: "bg-orange-50 text-orange-700 ring-orange-100",
  visit_scheduled: "bg-cyan-50 text-cyan-700 ring-cyan-100",
  visited: "bg-teal-50 text-teal-700 ring-teal-100",
  negotiation: "bg-yellow-50 text-yellow-800 ring-yellow-100",
  booked: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  completed: "bg-green-50 text-green-800 ring-green-100",
  lost: "bg-neutral-100 text-body ring-neutral-200",
};

interface LeadStatusBadgeProps {
  status: LeadStatus;
  className?: string;
}

export default function LeadStatusBadge({ status, className = "" }: LeadStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATUS_COLORS[status]} ${className}`}
    >
      {LEAD_STATUS_LABELS[status]}
    </span>
  );
}
