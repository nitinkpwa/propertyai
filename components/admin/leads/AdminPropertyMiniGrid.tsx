"use client";

import Link from "next/link";
import type { AdminPropertyEmbed } from "@/lib/admin/leads/types";
import { formatPropertyPrice } from "@/lib/properties/pricingDisplay";

export default function AdminPropertyMiniGrid({
  properties,
}: {
  properties: AdminPropertyEmbed[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {properties.map((property) => (
        <Link
          key={property.id}
          href={`/property/${property.id}`}
          className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/40"
        >
          <p className="font-semibold text-heading-primary">{property.title}</p>
          <p className="mt-1 text-sm text-muted">
            {[property.location, property.city].filter(Boolean).join(", ") || "—"}
          </p>
          <p className="mt-2 text-sm font-semibold text-emerald-700">
            {formatPropertyPrice({
              price: property.price,
              sub_type: property.sub_type,
            }).displayPrice}
          </p>
        </Link>
      ))}
    </div>
  );
}
