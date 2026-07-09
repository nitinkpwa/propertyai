"use client";

import { useEffect, useState } from "react";
import PartnerStatusBadge from "@/components/admin/connect/PartnerStatusBadge";

interface ConnectPartnerPropertySectionProps {
  propertyId: string;
}

export default function ConnectPartnerPropertySection({
  propertyId,
}: ConnectPartnerPropertySectionProps) {
  const [partner, setPartner] = useState<{
    id: string;
    company_name: string;
    manager_name: string;
    email: string;
    phone: string;
    status: string;
  } | null>(null);

  useEffect(() => {
    fetch(`/api/admin/properties/${propertyId}/partner`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setPartner(data?.partner ?? null))
      .catch(() => {});
  }, [propertyId]);

  if (!partner) return null;

  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-800">
        Assigned Connect Partner
      </h3>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-neutral-900">{partner.company_name}</p>
          <p className="mt-1 text-sm text-neutral-600">{partner.manager_name}</p>
          <p className="text-sm text-neutral-500">{partner.email} · {partner.phone}</p>
        </div>
        <PartnerStatusBadge status={partner.status} />
      </div>
    </section>
  );
}
