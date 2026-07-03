"use client";

import Link from "next/link";
import { formatPrice } from "@/lib/admin/constants";
import type { AdminPropertyEmbed } from "@/lib/admin/leads/types";

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
          <p className="font-semibold text-neutral-900">{property.title}</p>
          <p className="mt-1 text-sm text-neutral-500">
            {[property.location, property.city].filter(Boolean).join(", ") || "—"}
          </p>
          {property.price != null ? (
            <p className="mt-2 text-sm font-semibold text-emerald-700">{formatPrice(property.price)}</p>
          ) : null}
        </Link>
      ))}
    </div>
  );
}
