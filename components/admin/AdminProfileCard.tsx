"use client";

import { formatDate } from "@/lib/admin/constants";
import {
  roleBadgeClass,
  resolveProfileDisplay,
  resolvePropertySellerDisplay,
  type ProfileLike,
  type ResolveProfileOptions,
} from "@/lib/admin/profileDisplay";
import type { BuyerProfileForCRM } from "@/lib/crm/buyerProfile";
import type { Profile } from "@/lib/supabase";

interface AdminProfileCardProps {
  profile?: ProfileLike | BuyerProfileForCRM | null;
  profileId?: string | null;
  lookup?: Map<string, Profile>;
  status?: string | null;
  statusClassName?: string;
  subtitle?: string | null;
  /** compact = single-row summary; full = stacked detail card */
  variant?: "compact" | "full";
  className?: string;
}

function FieldRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-label">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium text-heading-secondary">{value?.trim() || "—"}</p>
    </div>
  );
}

export default function AdminProfileCard({
  profile,
  profileId,
  lookup,
  status,
  statusClassName = "bg-emerald-50 text-emerald-700",
  subtitle,
  variant = "full",
  className = "",
}: AdminProfileCardProps) {
  const options: ResolveProfileOptions = { profileId, lookup };
  const resolved = resolveProfileDisplay(profile, options);

  const avatar = (
    <div
      className={`flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 font-bold text-white ${
        variant === "compact" ? "h-10 w-10 text-sm" : "h-14 w-14 text-lg"
      }`}
      aria-hidden
    >
      {resolved.initials}
    </div>
  );

  const roleBadge = resolved.role ? (
    <span
      className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${roleBadgeClass(resolved.role)}`}
    >
      {resolved.roleLabel}
    </span>
  ) : null;

  const statusBadge =
    status != null && status !== "" ? (
      <span
        className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${statusClassName}`}
      >
        {status.replace(/_/g, " ")}
      </span>
    ) : null;

  if (variant === "compact") {
    return (
      <div className={`flex min-w-0 items-center gap-3 ${className}`}>
        {avatar}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium text-heading-primary">{resolved.displayName}</p>
            {roleBadge}
            {statusBadge}
          </div>
          <p className="truncate text-xs text-muted">
            {[resolved.phone, resolved.email].filter(Boolean).join(" · ") || "—"}
          </p>
          {subtitle ? <p className="truncate text-xs text-muted">{subtitle}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-neutral-100 bg-neutral-50/80 p-4 ${className}`}>
      <div className="flex flex-wrap items-start gap-4">
        {avatar}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-heading-primary">{resolved.displayName}</h3>
            {roleBadge}
            {statusBadge}
          </div>
          {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <FieldRow label="Phone" value={resolved.phone} />
            <FieldRow label="Email" value={resolved.email} />
            <FieldRow
              label="Joined"
              value={resolved.createdAt ? formatDate(resolved.createdAt) : null}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminResolvedProfileInline({ resolved }: { resolved: ReturnType<typeof resolveProfileDisplay> }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-[10px] font-bold text-emerald-800"
        aria-hidden
      >
        {resolved.initials}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-heading-primary">{resolved.displayName}</p>
        <p className="truncate text-xs text-muted">
          {[resolved.phone, resolved.email].filter(Boolean).join(" · ") || "—"}
        </p>
      </div>
    </div>
  );
}

export function AdminProfileInline({
  profile,
  profileId,
  lookup,
}: {
  profile?: ProfileLike | BuyerProfileForCRM | null;
  profileId?: string | null;
  lookup?: Map<string, Profile>;
}) {
  const resolved = resolveProfileDisplay(profile, { profileId, lookup });
  return <AdminResolvedProfileInline resolved={resolved} />;
}

export function AdminPropertySellerInline({
  property,
  lookup,
}: {
  property: {
    seller_id?: string;
    seller?: ProfileLike | null;
    contact_name?: string | null;
    contact_phone?: string | null;
  };
  lookup?: Map<string, Profile>;
}) {
  const resolved = resolvePropertySellerDisplay(property, lookup);
  return <AdminResolvedProfileInline resolved={resolved} />;
}
