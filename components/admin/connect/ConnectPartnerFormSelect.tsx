"use client";

import { useActiveConnectPartners } from "@/lib/connect/partners/useActiveConnectPartners";

interface ConnectPartnerFormSelectProps {
  value: string;
  onChange: (partnerId: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function ConnectPartnerFormSelect({
  value,
  onChange,
  disabled = false,
  className = "",
}: ConnectPartnerFormSelectProps) {
  const { partners, loading } = useActiveConnectPartners();

  return (
    <select
      className={`w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm ${className}`}
      value={value}
      disabled={disabled || loading}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{loading ? "Loading partners…" : "No Connect Partner"}</option>
      {partners.map((p) => (
        <option key={p.id} value={p.id}>
          {p.company_name}
        </option>
      ))}
    </select>
  );
}
