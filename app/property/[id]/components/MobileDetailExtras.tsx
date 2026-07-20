"use client";

import Link from "next/link";
import { Accordion, AccordionItem } from "@/components/ui/Accordion";
import BuilderCard from "@/components/ui/BuilderCard";
import type { PropertyDetail } from "../data";

/** Mobile-only description + builder blocks */
export default function MobileDetailExtras({ property }: { property: PropertyDetail }) {
  return (
    <div className="space-y-4 lg:hidden">
      {property.description ? (
        <Accordion>
          <AccordionItem title="Description" defaultOpen>
            <p className="whitespace-pre-wrap text-base leading-relaxed text-body">
              {property.description}
            </p>
          </AccordionItem>
        </Accordion>
      ) : null}

      <BuilderCard
        name={property.builder.name}
        projectsCount={property.builder.projectsDelivered ?? undefined}
      />

      <Link
        href={`/ask?propertyId=${property.id}&q=${encodeURIComponent(
          `Tell me about ${property.name}`,
        )}`}
        className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-4 active:scale-[0.99]"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" strokeLinecap="round" />
            <circle cx="12" cy="12" r="3.5" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-heading-primary">Ask AreaIQ</p>
          <p className="text-sm text-muted">Get AI insights on this property</p>
        </div>
        <span className="text-brand-dark" aria-hidden>
          →
        </span>
      </Link>
    </div>
  );
}
