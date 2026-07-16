import PropertyCard from "@/app/components/PropertyCard";
import type { RecommendedProperty } from "../data";
import { SectionCard, SectionTitle } from "./shared";

interface RecommendationsProps {
  items: RecommendedProperty[];
}

export default function Recommendations({ items }: RecommendationsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <SectionCard>
      <SectionTitle
        title="Recommendations"
        subtitle="Not random — each pick includes why it may beat this listing"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {items.map(({ property, reasons, why }) => (
          <div key={property.id} className="space-y-2">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                Recommended because
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {reasons.map((r) => (
                  <span
                    key={r}
                    className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-100"
                  >
                    {r}
                  </span>
                ))}
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-body">{why}</p>
            </div>
            <PropertyCard {...property} />
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
