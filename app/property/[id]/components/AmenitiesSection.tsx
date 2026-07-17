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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {sorted.map((amenity) => (
          <div
            key={amenity}
            className="group flex flex-col items-center rounded-2xl border border-neutral-100 bg-neutral-50/50 px-3 py-5 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-200/60 hover:bg-emerald-50/40 hover:shadow-[0_4px_16px_rgba(34,197,94,0.08)] sm:px-4 sm:py-6"
          >
            <span className="text-2xl transition-transform duration-200 group-hover:scale-110 sm:text-3xl">
              {getAmenityIcon(amenity)}
            </span>
            <span className="mt-2.5 text-xs font-semibold text-body sm:text-sm">{amenity}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
