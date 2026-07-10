import type { ConnectPartnerStatus } from "@/lib/connect/partners/types";

const STATUS_STYLES: Record<ConnectPartnerStatus, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  suspended: "bg-rose-50 text-rose-700 ring-rose-200",
  archived: "bg-neutral-100 text-body ring-neutral-200",
};

export default function PartnerStatusBadge({ status }: { status: ConnectPartnerStatus | string }) {
  const normalized = (status in STATUS_STYLES ? status : "pending") as ConnectPartnerStatus;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ring-1 ring-inset ${STATUS_STYLES[normalized]}`}
    >
      {normalized}
    </span>
  );
}
