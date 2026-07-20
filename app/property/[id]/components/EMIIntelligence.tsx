"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatPrice, type PropertyDetail } from "../data";
import { formatInrAmount } from "@/lib/properties/pricingDisplay";
import { SectionCard, SectionTitle } from "./shared";

interface EMIIntelligenceProps {
  property: PropertyDetail;
  expectedMonthlyRent: number | null;
}

function calcEmi(principal: number, annualRate: number, years: number): number {
  if (!principal || !annualRate || !years) return 0;
  const r = annualRate / 12 / 100;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function isPlotProperty(property: PropertyDetail): boolean {
  const t = `${property.propertyType} ${property.pricingDisplay?.preferredUnit || ""}`.toLowerCase();
  return (
    /plot/.test(t) ||
    property.pricingDisplay?.preferredUnit === "sqyd" ||
    Boolean(property.pricingDisplay?.pricePerSqyd)
  );
}

export default function EMIIntelligence({
  property,
  expectedMonthlyRent,
}: EMIIntelligenceProps) {
  const pd = property.pricingDisplay;
  const plotMode = isPlotProperty(property);

  const ratePerUnit = plotMode
    ? pd?.pricePerSqyd || pd?.pricePerSqft || pd?.pricePerAcre || 0
    : 0;
  const unitLabel =
    pd?.plotSizeUnit ||
    (pd?.preferredUnit === "acre" ? "Acre" : pd?.preferredUnit === "sqft" ? "Sq Ft" : "Sq Yard");

  const minSize = plotMode
    ? pd?.minPlotSize || pd?.maxPlotSize || 0
    : 0;
  const maxSize = plotMode
    ? pd?.maxPlotSize || pd?.minPlotSize || 0
    : 0;
  const hasRange = plotMode && minSize > 0 && maxSize > minSize;

  const [selectedSize, setSelectedSize] = useState(() =>
    plotMode && minSize > 0 ? minSize : 0,
  );
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(8.5);
  const [tenure, setTenure] = useState(20);

  useEffect(() => {
    if (!plotMode) return;
    if (minSize <= 0) return;
    setSelectedSize((prev) => {
      if (prev <= 0) return minSize;
      if (hasRange) return Math.min(maxSize, Math.max(minSize, prev));
      return minSize;
    });
  }, [plotMode, minSize, maxSize, hasRange]);

  // Always EMI on purchase value — never on per-unit rate alone
  // property.price is already from calculateDisplayPrice at map time
  const propertyValue = useMemo(() => {
    if (plotMode && ratePerUnit > 0 && selectedSize > 0) {
      return ratePerUnit * selectedSize;
    }
    if (property.price > 0) return property.price;
    if (pd?.totalPrice && pd.totalPrice > 0) return pd.totalPrice;
    if (pd?.estimatedStartingPrice && pd.estimatedStartingPrice > 0) {
      return pd.estimatedStartingPrice;
    }
    return 0;
  }, [plotMode, ratePerUnit, selectedSize, pd, property.price]);

  const loanAmount = Math.max(0, propertyValue * (1 - downPct / 100));
  const downPayment = Math.max(0, propertyValue - loanAmount);

  const monthlyEmi = useMemo(
    () => calcEmi(loanAmount, rate, tenure),
    [loanAmount, rate, tenure],
  );

  const salaryRequired = monthlyEmi > 0 ? Math.round(monthlyEmi / 0.4) : 0;
  const recommendedSalary = Math.round(salaryRequired * 1.15);
  const rentalOffset = expectedMonthlyRent ?? 0;
  const netEmi = Math.max(0, monthlyEmi - rentalOffset);
  const annualInterestApprox = loanAmount * (rate / 100) * 0.7;
  const taxBenefit = Math.round(Math.min(200_000, Math.max(0, annualInterestApprox)) * 0.3);
  const investmentReturnProxy =
    propertyValue > 0 && monthlyEmi > 0
      ? Math.round((((rentalOffset * 12) / propertyValue) * 100) * 10) / 10
      : null;

  const rateDisplay =
    plotMode && ratePerUnit > 0
      ? `₹${Math.round(ratePerUnit).toLocaleString("en-IN")} / ${unitLabel}`
      : null;

  const canCalculate = propertyValue > 0;

  return (
    <SectionCard>
      <SectionTitle
        title="EMI Intelligence"
        subtitle={
          plotMode
            ? "Affordability based on estimated plot purchase value (size × rate)"
            : "Advanced affordability calculator prefilled with this listing’s price"
        }
      />

      {/* Plot summary */}
      {plotMode && ratePerUnit > 0 ? (
        <motion.div
          layout
          className="mb-6 grid gap-3 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 via-white to-white p-4 sm:grid-cols-3 sm:p-5"
        >
          <SummaryTile label="Rate" value={rateDisplay || "—"} />
          <SummaryTile
            label="Selected Size"
            value={
              selectedSize > 0
                ? `${selectedSize.toLocaleString("en-IN")} ${unitLabel}`
                : "—"
            }
          />
          <SummaryTile
            label="Estimated Property Value"
            value={canCalculate ? formatInrAmount(propertyValue) : "Price on Request"}
            emphasize
            animateKey={propertyValue}
          />
        </motion.div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          {plotMode && ratePerUnit > 0 ? (
            <>
              <Field label="Rate" value={rateDisplay || "—"} readOnly />

              {hasRange ? (
                <label className="block">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-label">
                      Plot Size
                    </span>
                    <motion.span
                      key={selectedSize}
                      initial={{ opacity: 0.5, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm font-bold tabular-nums text-emerald-700"
                    >
                      {selectedSize.toLocaleString("en-IN")} {unitLabel}
                    </motion.span>
                  </div>
                  <div className="mt-3">
                    <input
                      type="range"
                      min={minSize}
                      max={maxSize}
                      step={1}
                      value={selectedSize}
                      onChange={(e) => setSelectedSize(Number(e.target.value))}
                      className="mt-1 h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-emerald-500 to-emerald-200 accent-emerald-500 disabled:cursor-not-allowed disabled:opacity-45 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-emerald-500 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_2px_8px_rgba(74,170,39,0.35)]"
                      aria-label="Plot size"
                    />
                    <div className="mt-1.5 flex justify-between text-[11px] font-medium text-muted">
                      <span>
                        {minSize.toLocaleString("en-IN")} {unitLabel}
                      </span>
                      <span>
                        {maxSize.toLocaleString("en-IN")} {unitLabel}
                      </span>
                    </div>
                  </div>
                </label>
              ) : minSize > 0 ? (
                <Field
                  label="Plot Size"
                  value={`${minSize.toLocaleString("en-IN")} ${unitLabel}`}
                  readOnly
                />
              ) : (
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wider text-label">
                    Plot Size ({unitLabel})
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={selectedSize || ""}
                    onChange={(e) => setSelectedSize(parseFloat(e.target.value) || 0)}
                    placeholder="Enter plot size"
                    className="mt-2 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </label>
              )}

              <Field
                label="Estimated Property Value"
                value={canCalculate ? formatInrAmount(propertyValue) : "—"}
                readOnly
              />
            </>
          ) : (
            <Field
              label="Property Price"
              value={canCalculate ? formatPrice(propertyValue) : "Price on Request"}
              readOnly
            />
          )}

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
              disabled={!canCalculate}
              className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-emerald-500 to-emerald-200 accent-emerald-500 disabled:cursor-not-allowed disabled:opacity-45 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-emerald-500 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_2px_8px_rgba(74,170,39,0.35)]"
            />
            <AnimatePresence mode="wait">
              <motion.p
                key={downPayment}
                initial={{ opacity: 0.4 }}
                animate={{ opacity: 1 }}
                className="mt-1 text-sm font-medium text-heading-primary"
              >
                {canCalculate ? formatPrice(Math.round(downPayment)) : "—"}
              </motion.p>
            </AnimatePresence>
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

        <div className="grid grid-cols-2 content-start gap-3">
          <Stat
            label="Monthly EMI"
            value={canCalculate ? formatPrice(Math.round(monthlyEmi)) : "—"}
            emphasize
            animateKey={monthlyEmi}
          />
          <Stat
            label="Loan Amount"
            value={canCalculate ? formatPrice(Math.round(loanAmount)) : "—"}
            animateKey={loanAmount}
          />
          <Stat
            label="Salary Required"
            value={canCalculate ? formatPrice(salaryRequired) : "—"}
            animateKey={salaryRequired}
          />
          <Stat
            label="Recommended Salary"
            value={canCalculate ? formatPrice(recommendedSalary) : "—"}
            animateKey={recommendedSalary}
          />
          <Stat
            label="Rental Offset"
            value={rentalOffset > 0 ? `${formatPrice(rentalOffset)}/mo` : "—"}
          />
          <Stat
            label="Net EMI after Rent"
            value={canCalculate ? formatPrice(Math.round(netEmi)) : "—"}
            animateKey={netEmi}
          />
          <Stat
            label="Investment Return"
            value={investmentReturnProxy !== null ? `${investmentReturnProxy}% yield` : "—"}
          />
          <Stat
            label="Tax Benefit (est.)"
            value={canCalculate ? `${formatPrice(taxBenefit)}/yr` : "—"}
            animateKey={taxBenefit}
          />
        </div>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-muted">
        {plotMode
          ? "Plot EMI uses estimated purchase value = selected size × rate per unit — never the rate alone. "
          : ""}
        Illustrative only. Salary assumes ~40% FOIR. Tax benefit uses a simplified 30% slab on
        eligible home-loan interest (capped). Confirm with your bank and tax advisor.
      </p>
    </SectionCard>
  );
}

function SummaryTile({
  label,
  value,
  emphasize,
  animateKey,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  animateKey?: number;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-label">{label}</p>
      <AnimatePresence mode="wait">
        <motion.p
          key={animateKey ?? value}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
          className={`mt-1 text-base font-bold tabular-nums sm:text-lg ${
            emphasize ? "text-emerald-700" : "text-heading-primary"
          }`}
        >
          {value}
        </motion.p>
      </AnimatePresence>
    </div>
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
  animateKey,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  animateKey?: number;
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
      <AnimatePresence mode="wait">
        <motion.p
          key={animateKey ?? value}
          initial={{ opacity: 0.35, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16 }}
          className={`mt-1 text-base font-bold tabular-nums ${
            emphasize ? "text-emerald-800" : "text-heading-primary"
          }`}
        >
          {value}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
