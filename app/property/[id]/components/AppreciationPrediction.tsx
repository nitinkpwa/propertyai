import type { AppreciationData } from "../data";
import { formatPrice } from "../data";
import { SectionCard, SectionTitle } from "./shared";

interface AppreciationPredictionProps {
  data: AppreciationData;
  currentPrice: number;
}

export default function AppreciationPrediction({
  data,
  currentPrice,
}: AppreciationPredictionProps) {
  if (!data.scenarios.length || data.baseAnnualRate == null) {
    return (
      <SectionCard>
        <SectionTitle
          title="Appreciation Prediction"
          subtitle="Verified growth signals required"
        />
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/80 px-5 py-8 text-center">
          <p className="text-sm font-semibold text-heading-primary">
            {data.expectedGrowthLabel || "Insufficient verified data"}
          </p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-muted">
            AreaIQ does not invent appreciation percentages. Growth ranges appear only when price
            trend and infrastructure signals are verified.
          </p>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard>
      <SectionTitle
        title="Appreciation Prediction"
        subtitle={`Expected growth range: ${data.expectedGrowthLabel}`}
      />

      <div className="mb-4 rounded-xl border border-neutral-100 bg-neutral-50/80 px-4 py-3 text-sm text-body">
        Current listed value{" "}
        <span className="font-bold text-heading-primary">{formatPrice(currentPrice)}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-xs uppercase tracking-wider text-label">
              <th className="py-2 pr-4 font-semibold">Scenario</th>
              <th className="py-2 pr-4 font-semibold">Rate</th>
              <th className="py-2 pr-4 font-semibold">1 Year</th>
              <th className="py-2 pr-4 font-semibold">3 Years</th>
              <th className="py-2 font-semibold">5 Years</th>
            </tr>
          </thead>
          <tbody>
            {data.scenarios.map((s) => (
              <tr key={s.label} className="border-b border-neutral-50 last:border-0">
                <td className="py-3 pr-4 font-semibold text-heading-primary">{s.label}</td>
                <td className="py-3 pr-4 tabular-nums text-muted">{s.annualRatePercent}% p.a.</td>
                <td className="py-3 pr-4 font-medium tabular-nums text-body">
                  {formatPrice(s.year1)}
                </td>
                <td className="py-3 pr-4 font-medium tabular-nums text-body">
                  {formatPrice(s.year3)}
                </td>
                <td className="py-3 font-medium tabular-nums text-emerald-700">
                  {formatPrice(s.year5)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-label">Assumptions</p>
        <ul className="space-y-1.5">
          {data.assumptions.map((a) => (
            <li key={a} className="flex gap-2 text-xs leading-relaxed text-muted sm:text-sm">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500" />
              {a}
            </li>
          ))}
        </ul>
      </div>
    </SectionCard>
  );
}
