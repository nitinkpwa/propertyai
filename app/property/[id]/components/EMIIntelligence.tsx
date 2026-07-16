"use client";

import { useMemo, useState } from "react";
import { formatPrice } from "../data";
import { SectionCard, SectionTitle } from "./shared";

interface EMIIntelligenceProps {
  price: number;
  expectedMonthlyRent: number | null;
}

function calcEmi(principal: number, annualRate: number, years: number): number {
  if (!principal || !annualRate || !years) return 0;
  const r = annualRate / 12 / 100;
  const n = years * 12;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export default function EMIIntelligence({ price, expectedMonthlyRent }: EMIIntelligenceProps) {
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(8.5);
  const [tenure, setTenure] = useState(20);

  const loanAmount = Math.max(0, price * (1 - downPct / 100));
  const downPayment = price - loanAmount;

  const monthlyEmi = useMemo(
    () => calcEmi(loanAmount, rate, tenure),
    [loanAmount, rate, tenure],
  );

  // FOIR ~40% of monthly income for EMI
  const salaryRequired = monthlyEmi > 0 ? Math.round(monthlyEmi / 0.4) : 0;
  const recommendedSalary = Math.round(salaryRequired * 1.15);
  const rentalOffset = expectedMonthlyRent ?? 0;
  const netEmi = Math.max(0, monthlyEmi - rentalOffset);
  // Section 24 interest deduction rough annual benefit at 30% slab on first 2L interest
  const annualInterestApprox = loanAmount * (rate / 100) * 0.7;
  const taxBenefit = Math.round(Math.min(200_000, Math.max(0, annualInterestApprox)) * 0.3);
  const investmentReturnProxy =
    price > 0 && monthlyEmi > 0
      ? Math.round((((rentalOffset * 12) / price) * 100) * 10) / 10
      : null;

  return (
    <SectionCard>
      <SectionTitle
        title="EMI Intelligence"
        subtitle="Advanced affordability calculator prefilled with this listing’s price"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Field label="Property Price" value={formatPrice(price)} readOnly />
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-label">
              Down Payment ({downPct}%)
            </span>
            <input
              type="range"
              min={10}
              max={50}
              step={5}
              value={downPct}
              onChange={(e) => setDownPct(Number(e.target.value))}
              className="mt-2 w-full accent-emerald-500"
            />
            <p className="mt-1 text-sm font-medium text-heading-primary">
              {formatPrice(downPayment)}
            </p>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-label">
              Interest Rate (% p.a.)
            </span>
            <input
              type="number"
              step={0.1}
              min={6}
              max={14}
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
              className="mt-2 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-label">
              Tenure (years)
            </span>
            <input
              type="number"
              min={5}
              max={30}
              value={tenure}
              onChange={(e) => setTenure(parseInt(e.target.value, 10) || 0)}
              className="mt-2 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3 content-start">
          <Stat label="Monthly EMI" value={formatPrice(Math.round(monthlyEmi))} emphasize />
          <Stat label="Loan Amount" value={formatPrice(Math.round(loanAmount))} />
          <Stat label="Salary Required" value={formatPrice(salaryRequired)} />
          <Stat label="Recommended Salary" value={formatPrice(recommendedSalary)} />
          <Stat
            label="Rental Offset"
            value={rentalOffset > 0 ? `${formatPrice(rentalOffset)}/mo` : "—"}
          />
          <Stat label="Net EMI after Rent" value={formatPrice(Math.round(netEmi))} />
          <Stat
            label="Investment Return"
            value={investmentReturnProxy !== null ? `${investmentReturnProxy}% yield` : "—"}
          />
          <Stat label="Tax Benefit (est.)" value={`${formatPrice(taxBenefit)}/yr`} />
        </div>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-muted">
        Illustrative only. Salary assumes ~40% FOIR. Tax benefit uses a simplified 30% slab on
        eligible home-loan interest (capped). Confirm with your bank and tax advisor.
      </p>
    </SectionCard>
  );
}

function Field({
  label,
  value,
  readOnly,
}: {
  label: string;
  value: string;
  readOnly?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-label">{label}</span>
      <input
        readOnly={readOnly}
        value={value}
        className="mt-2 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm font-semibold text-heading-primary"
      />
    </label>
  );
}

function Stat({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        emphasize
          ? "border-emerald-200 bg-emerald-50/50"
          : "border-neutral-100 bg-neutral-50/60"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-label">{label}</p>
      <p
        className={`mt-1 text-base font-bold tabular-nums ${
          emphasize ? "text-emerald-800" : "text-heading-primary"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
