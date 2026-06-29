import type { PropertyDetail } from "../data";
import { getAmenityIcon, SectionCard, SectionTitle } from "./shared";

interface AmenitiesSectionProps {
  amenities: PropertyDetail["amenities"];
}

export default function AmenitiesSection({ amenities }: AmenitiesSectionProps) {
  return (
    <SectionCard>
      <SectionTitle title="Amenities" subtitle="Premium lifestyle features at your doorstep" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {amenities.map((amenity) => (
          <div
            key={amenity}
            className="group flex flex-col items-center rounded-2xl border border-neutral-100 bg-neutral-50/50 px-3 py-5 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-200/60 hover:bg-emerald-50/40 hover:shadow-[0_4px_16px_rgba(34,197,94,0.08)] sm:px-4 sm:py-6"
          >
            <span className="text-2xl transition-transform duration-200 group-hover:scale-110 sm:text-3xl">
              {getAmenityIcon(amenity)}
            </span>
            <span className="mt-2.5 text-xs font-semibold text-neutral-700 sm:text-sm">{amenity}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
