import type { PropertyDetail } from "../data";
import { EMERALD, SectionCard, SectionTitle } from "./shared";

interface BuilderSectionProps {
  builder: PropertyDetail["builder"];
}

export default function BuilderSection({ builder }: BuilderSectionProps) {
  return (
    <SectionCard>
      <SectionTitle title="Builder Information" />

      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <div
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-[0_4px_16px_rgba(34,197,94,0.3)] sm:h-24 sm:w-24 sm:rounded-3xl sm:text-3xl"
          style={{ backgroundColor: EMERALD }}
        >
          {builder.logoInitials}
        </div>

        <div className="flex-1">
          <h3 className="text-xl font-bold text-heading-primary sm:text-2xl">{builder.name}</h3>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:gap-8">
            <Stat
              label="Years Experience"
              value={builder.yearsExperience !== null ? `${builder.yearsExperience}+` : "Not available"}
            />
            <Stat
              label="Projects Delivered"
              value={builder.projectsDelivered !== null ? String(builder.projectsDelivered) : "Not available"}
            />
          </div>
        </div>

        <button
          type="button"
          className="w-full shrink-0 rounded-xl border border-neutral-200 px-6 py-3 text-sm font-semibold text-heading-secondary transition-all hover:border-neutral-300 hover:bg-neutral-50 active:scale-[0.98] sm:w-auto"
        >
          View Builder Profile
        </button>
      </div>
    </SectionCard>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-2xl font-bold tabular-nums text-heading-primary">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-label">{label}</p>
    </div>
  );
}
