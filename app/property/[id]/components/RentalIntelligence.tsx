import type { RentalIntelData } from "../data";
import { formatPrice } from "../data";
import { SectionCard, SectionTitle } from "./shared";

interface RentalIntelligenceProps {
  data: RentalIntelData;
}

export default function RentalIntelligence({ data }: RentalIntelligenceProps) {
  const cells = [
    {
      label: "Expected Rent",
      value:
        data.expectedMonthlyRent !== null
          ? `${formatPrice(data.expectedMonthlyRent)}/mo`
          : "—",
    },
    {
      label: "Rental Income",
      value: data.annualIncome !== null ? `${formatPrice(data.annualIncome)}/yr` : "—",
    },
    {
      label: "Yield",
      value: data.yieldPercent !== null ? `${data.yieldPercent}%` : "—",
    },
    { label: "Demand", value: data.demandLabel },
    { label: "Occupancy", value: data.occupancyLabel },
    {
      label: "Cash Flow*",
      value:
        data.cashFlowEstimate !== null
          ? `${data.cashFlowEstimate >= 0 ? "+" : ""}${formatPrice(Math.abs(data.cashFlowEstimate))}/mo`
          : "—",
    },
    { label: "ROI", value: data.roiLabel },
  ];

  return (
    <SectionCard>
      <SectionTitle
        title="Rental Intelligence"
        subtitle="Income, demand, yield, and cash-flow signals for investors"
      />

      {!data.available ? (
        <p className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4 text-sm text-muted">
          {data.aiOpinion}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {cells.map((cell) => (
              <div
                key={cell.label}
                className="rounded-2xl border border-neutral-100 bg-neutral-50/60 p-4"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-label">
                  {cell.label}
                </p>
                <p className="mt-1 text-base font-bold text-heading-primary">{cell.value}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted">
            *Cash flow assumes illustrative 20% down, 20-year loan at 8.5% interest.
          </p>
          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              AI Opinion
            </p>
            <p className="mt-2 text-sm leading-relaxed text-body">{data.aiOpinion}</p>
          </div>
        </>
      )}
    </SectionCard>
  );
}
