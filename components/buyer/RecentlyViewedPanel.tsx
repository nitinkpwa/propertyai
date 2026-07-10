"use client";

import Link from "next/link";
import PropertyCard, { type PropertyCardProps } from "@/app/components/PropertyCard";

type ViewedProperty = PropertyCardProps & { viewedAt: string };

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

interface RecentlyViewedPanelProps {
  properties: ViewedProperty[];
}

export default function RecentlyViewedPanel({ properties }: RecentlyViewedPanelProps) {
  if (properties.length === 0) return null;

  return (
    <section aria-label="Recently viewed">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-heading-primary">Recently Viewed</h2>
          <p className="text-xs text-muted">Continue where you left off</p>
        </div>
        <Link href="/properties" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700">
          Browse more →
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {properties.map((property) => (
          <div key={property.id}>
            <PropertyCard {...property} />
            <p className="mt-2 text-xs text-muted">
              Viewed {formatRelativeTime(property.viewedAt)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
