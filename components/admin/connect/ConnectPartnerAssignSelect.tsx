"use client";

import { useEffect, useState } from "react";
import { useActiveConnectPartners } from "@/lib/connect/partners/useActiveConnectPartners";

interface ConnectPartnerAssignSelectProps {
  propertyId: string;
  currentPartnerId?: string | null;
  onAssigned?: () => void;
  className?: string;
}

export default function ConnectPartnerAssignSelect({
  propertyId,
  currentPartnerId,
  onAssigned,
  className = "",
}: ConnectPartnerAssignSelectProps) {
  const { partners, loading } = useActiveConnectPartners();
  const [value, setValue] = useState(currentPartnerId ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(currentPartnerId ?? "");
  }, [currentPartnerId]);

  const handleChange = async (partnerId: string) => {
    setValue(partnerId);
    setSaving(true);
    const res = await fetch(`/api/admin/properties/${propertyId}/partner`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectPartnerId: partnerId || null }),
    });
    setSaving(false);
    if (res.ok) onAssigned?.();
  };

  return (
    <select
      className={`rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs ${className}`}
      value={value}
      disabled={loading || saving}
      onChange={(e) => handleChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
    >
      <option value="">Remove assignment</option>
      {partners.map((p) => (
        <option key={p.id} value={p.id}>
          Assign: {p.company_name}
        </option>
      ))}
    </select>
  );
}
