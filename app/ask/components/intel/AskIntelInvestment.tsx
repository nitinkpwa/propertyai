"use client";

import { useMemo, useState } from "react";
import { formatInrAmount } from "@/lib/properties/pricingDisplay";

interface AskIntelInvestmentProps {
  defaultPrice?: number | null;
  mode?: "investment" | "loan";
  onAction: (q: string) => void;
}

function calcEmi(principal: number, annualRate: number, years: number): number {
  if (!principal || !annualRate || !years) return 0;
  const r = annualRate / 12 / 100;
  const n = years * 12;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function formatINR(n: number): string {
  return formatInrAmount(n);
}

export function AskIntelInvestment({
  defaultPrice = 8_000_000,
  mode = "investment",
  onAction,
}: AskIntelInvestmentProps) {
  const [price, setPrice] = useState(defaultPrice ?? 8_000_000);
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(8.5);
  const [tenure, setTenure] = useState(20);
  const [rent, setRent] = useState(25_000);
  const [futureValue, setFutureValue] = useState(Math.round((defaultPrice ?? 8_000_000) * 1.35));

  const loan = price * (1 - downPct / 100);
  const emi = useMemo(() => calcEmi(loan, rate, tenure), [loan, rate, tenure]);
  const yieldPct = price > 0 ? ((rent * 12) / price) * 100 : 0;
  const appreciationPct = price > 0 ? ((futureValue - price) / price) * 100 : 0;

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-wider text-label">
        {mode === "loan" ? "Mortgage calculator" : "ROI calculator"}
      </p>
      <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm space-y-3">
        <Field
          label="Price"
          value={String(Math.round(price / 100_000))}
          suffix="L"
          onChange={(v) => setPrice((parseFloat(v) || 0) * 100_000)}
        />
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-label">
            Down payment {downPct}%
          </span>
          <input
            type="range"
            min={10}
            max={50}
            value={downPct}
            onChange={(e) => setDownPct(Number(e.target.value))}
            className="mt-1 w-full accent-emerald-500"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Interest %" value={String(rate)} onChange={(v) => setRate(parseFloat(v) || 0)} />
          <Field label="Tenure yrs" value={String(tenure)} onChange={(v) => setTenure(parseInt(v, 10) || 0)} />
        </div>
        {mode === "investment" ? (
          <>
            <Field label="Monthly rent" value={String(rent)} onChange={(v) => setRent(parseFloat(v) || 0)} />
            <Field
              label="Expected value (5y)"
              value={String(Math.round(futureValue / 100_000))}
              suffix="L"
              onChange={(v) => setFutureValue((parseFloat(v) || 0) * 100_000)}
            />
          </>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <Stat label="Monthly EMI" value={formatINR(emi)} emphasize />
          <Stat label="Loan amount" value={formatINR(loan)} />
          {mode === "investment" ? (
            <>
              <Stat label="Gross yield" value={`${yieldPct.toFixed(2)}%`} />
              <Stat label="5y appreciation" value={`${appreciationPct.toFixed(1)}%`} />
            </>
          ) : (
            <>
              <Stat label="Salary needed" value={formatINR(emi / 0.4)} />
              <Stat label="Total interest" value={formatINR(emi * tenure * 12 - loan)} />
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() =>
            onAction(
              mode === "loan"
                ? `Explain EMI for ₹${Math.round(price / 100_000)} lakh loan`
                : `Generate investment report for ₹${Math.round(price / 100_000)} lakh property`,
            )
          }
          className="w-full rounded-xl bg-emerald-500 py-2.5 text-xs font-semibold text-white"
        >
          {mode === "loan" ? "Explain this loan with AI" : "Generate investment report"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-label">{label}</span>
      <div className="mt-1 flex items-center gap-1 rounded-xl border border-neutral-200 bg-neutral-50 px-2.5">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent py-2 text-sm font-semibold outline-none"
        />
        {suffix ? <span className="text-xs text-muted">{suffix}</span> : null}
      </div>
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
      className={`rounded-xl px-2.5 py-2 ${
        emphasize ? "bg-emerald-50" : "bg-neutral-50"
      }`}
    >
      <p className="text-[9px] font-semibold uppercase tracking-wider text-label">{label}</p>
      <p className={`mt-0.5 text-sm font-bold tabular-nums ${emphasize ? "text-emerald-800" : "text-heading-primary"}`}>
        {value}
      </p>
    </div>
  );
}
