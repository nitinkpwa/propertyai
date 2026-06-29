"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import PropertyCard, { type PropertyCardProps } from "@/app/components/PropertyCard";
import { formatPrice } from "@/app/property/[id]/data";
import {
  fetchComparedPropertyCards,
  removeComparedProperty,
} from "@/lib/buyer/queries";
import EmptyState from "../components/EmptyState";

type ComparedCard = PropertyCardProps & { compareRowId: string };

export default function ComparePage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ComparedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchComparedPropertyCards(user.id).then((data) => {
      setItems(data);
      setLoading(false);
    });
  }, [user]);

  const handleRemove = async (compareRowId: string) => {
    setRemovingId(compareRowId);
    const ok = await removeComparedProperty(compareRowId);
    if (ok) setItems((prev) => prev.filter((item) => item.compareRowId !== compareRowId));
    setRemovingId(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
          Compare Properties
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Review your shortlisted properties side by side
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon="⚖️"
          title="Nothing to compare yet"
          description="Add properties to compare from listing cards to see them here."
        />
      ) : (
        <>
          <div className="-mx-4 flex gap-5 overflow-x-auto px-4 pb-2 snap-x snap-mandatory lg:mx-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:px-0 xl:grid-cols-3 2xl:grid-cols-4">
            {items.map(({ compareRowId, ...property }) => (
              <div
                key={compareRowId}
                className="w-[min(100%,320px)] shrink-0 snap-start lg:w-auto lg:shrink"
              >
                <PropertyCard {...property} isCompared />
                <button
                  type="button"
                  onClick={() => handleRemove(compareRowId)}
                  disabled={removingId === compareRowId}
                  className="mt-3 w-full rounded-xl border border-neutral-200 bg-white py-2.5 text-sm font-semibold text-neutral-700 transition-all hover:bg-neutral-50 disabled:opacity-60"
                >
                  {removingId === compareRowId ? "Removing..." : "Remove from Compare"}
                </button>
              </div>
            ))}
          </div>

          {items.length >= 2 ? (
            <div className="overflow-x-auto rounded-2xl border border-neutral-200/80 bg-white shadow-sm">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-neutral-100 bg-neutral-50/80">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-neutral-500">Attribute</th>
                    {items.map((item) => (
                      <th key={item.id} className="px-4 py-3 font-semibold text-neutral-900">
                        {item.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Price", render: (p: ComparedCard) => formatPrice(p.price) },
                    { label: "Location", render: (p: ComparedCard) => `${p.location}, ${p.city ?? ""}` },
                    { label: "Builder", render: (p: ComparedCard) => p.builderName },
                    { label: "BHK", render: (p: ComparedCard) => `${p.bhk} BHK` },
                    { label: "Area", render: (p: ComparedCard) => `${p.area.toLocaleString("en-IN")} sq ft` },
                    { label: "Growth Score", render: (p: ComparedCard) => `${p.growthScore}/100` },
                    { label: "Rental Yield", render: (p: ComparedCard) => `${p.rentalYield}%` },
                  ].map((row) => (
                    <tr key={row.label} className="border-b border-neutral-100 last:border-0">
                      <td className="px-4 py-3 font-medium text-neutral-500">{row.label}</td>
                      {items.map((item) => (
                        <td key={`${row.label}-${item.id}`} className="px-4 py-3 text-neutral-800">
                          {row.render(item)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
