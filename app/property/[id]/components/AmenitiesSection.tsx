import type { PropertyDetail } from "../data";
import { getAmenityIcon, SectionCard, SectionTitle } from "./shared";

interface AmenitiesSectionProps {
  amenities: PropertyDetail["amenities"];
}

const HIGHLIGHT_ORDER = [
  "Swimming Pool",
  "Club House",
  "Gym",
  "EV Charging",
  "Kids Area",
  "Security",
  "Parking",
  "Power Backup",
  "Garden",
  "Jogging Track",
  "Lift",
];

export default function AmenitiesSection({ amenities }: AmenitiesSectionProps) {
  const normalized = amenities.length > 0 ? amenities : [];
  const sorted = [
    ...HIGHLIGHT_ORDER.filter((name) =>
      normalized.some((a) => a.toLowerCase() === name.toLowerCase()),
    ),
    ...normalized.filter(
      (a) => !HIGHLIGHT_ORDER.some((h) => h.toLowerCase() === a.toLowerCase()),
    ),
  ];

  if (sorted.length === 0) {
    return (
      <SectionCard>
        <SectionTitle title="Amenities" subtitle="AreaIQ-detected lifestyle features" />
        <p className="text-sm text-muted">
          Amenities not listed yet for this property. Ask AreaIQ or book a visit to confirm on-site
          facilities.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard>
      <SectionTitle
        title="Amenities"
        subtitle="AreaIQ-detected and listing-verified lifestyle features"
      />
      {/* Mobile: horizontal chips · Desktop: grid cards */}
      <div className="-mx-1 flex gap-2 overflow-x-auto scroll-touch px-1 pb-1 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-4 lg:overflow-visible lg:px-0 lg:pb-0">
        {sorted.map((amenity) => (
          <div
            key={amenity}
            className="flex shrink-0 items-center gap-2 rounded-full border border-neutral-100 bg-neutral-50/80 px-3.5 py-2.5 lg:flex-col lg:items-center lg:rounded-2xl lg:px-4 lg:py-6 lg:text-center lg:transition-all lg:hover:-translate-y-0.5 lg:hover:border-emerald-200/60 lg:hover:bg-emerald-50/40"
          >
            <span className="text-lg lg:text-3xl">{getAmenityIcon(amenity)}</span>
            <span className="whitespace-nowrap text-sm font-semibold text-body lg:mt-2.5 lg:whitespace-normal lg:text-sm">
              {amenity}
            </span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
