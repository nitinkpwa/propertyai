"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import FadeIn from "./FadeIn";
import SectionHeader from "./SectionHeader";
import { INVESTMENT_TOOLS } from "./data";
import { IQ_GREEN } from "./theme";

type CalcTab = "emi" | "roi" | "rental" | "afford";

function formatINR(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default function InvestmentCalculators() {
  const [activeTool, setActiveTool] = useState<CalcTab | null>(null);
  const [loanAmount, setLoanAmount] = useState("5000000");
  const [rate, setRate] = useState("8.5");
  const [tenure, setTenure] = useState("20");
  const [purchasePrice, setPurchasePrice] = useState("6000000");
  const [expectedValue, setExpectedValue] = useState("9000000");
  const [monthlyRent, setMonthlyRent] = useState("25000");
  const [monthlyIncome, setMonthlyIncome] = useState("150000");

  const emi = useMemo(() => {
    const p = parseFloat(loanAmount) || 0;
    const r = (parseFloat(rate) || 0) / 12 / 100;
    const n = (parseFloat(tenure) || 0) * 12;
    if (!p || !r || !n) return 0;
    return (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }, [loanAmount, rate, tenure]);

  const roi = useMemo(() => {
    const buy = parseFloat(purchasePrice) || 0;
    const sell = parseFloat(expectedValue) || 0;
    if (!buy) return 0;
    return ((sell - buy) / buy) * 100;
  }, [purchasePrice, expectedValue]);

  const rentalYield = useMemo(() => {
    const price = parseFloat(purchasePrice) || 0;
    const rent = parseFloat(monthlyRent) || 0;
    if (!price) return 0;
    return ((rent * 12) / price) * 100;
  }, [purchasePrice, monthlyRent]);

  const affordMax = useMemo(() => {
    const income = parseFloat(monthlyIncome) || 0;
    return income * 0.4 * 12 * (parseFloat(tenure) || 20);
  }, [monthlyIncome, tenure]);

  const resultLabel = useMemo(() => {
    switch (activeTool) {
      case "emi":
        return formatINR(emi);
      case "roi":
        return `${roi.toFixed(1)}%`;
      case "rental":
        return `${rentalYield.toFixed(2)}%`;
      case "afford":
        return formatINR(affordMax);
      default:
        return "—";
    }
  }, [activeTool, emi, roi, rentalYield, affordMax]);

  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionHeader
            eyebrow="Investment Tools"
            title="Plan with confidence"
            description="Quick calculators — validate every number with AreaIQ AI before you commit."
          />
        </FadeIn>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {INVESTMENT_TOOLS.map((tool, i) => (
            <motion.button
              key={tool.title}
              type="button"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -4, scale: 1.02 }}
              onClick={() => {
                if ("href" in tool) {
                  window.location.href = tool.href;
                  return;
                }
                setActiveTool(tool.tab);
              }}
              className={`rounded-2xl border p-5 text-left transition-shadow ${
                "tab" in tool && activeTool === tool.tab
                  ? "border-emerald-200 bg-emerald-50/50 shadow-md"
                  : "border-neutral-200/80 bg-white shadow-sm hover:shadow-md"
              }`}
            >
              <span className="text-2xl">{tool.icon}</span>
              <p className="mt-3 font-bold text-neutral-900">{tool.title}</p>
              <p className="mt-1 text-xs text-neutral-500">{tool.desc}</p>
            </motion.button>
          ))}
        </div>

        {activeTool ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-8 grid gap-6 rounded-2xl border border-neutral-200/80 bg-[#F7F9FB] p-6 lg:grid-cols-2 lg:p-8"
          >
            <div className="space-y-4">
              {activeTool === "emi" ? (
                <>
                  <input type="number" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} placeholder="Loan amount" className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none" />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="number" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Rate %" className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none" />
                    <input type="number" value={tenure} onChange={(e) => setTenure(e.target.value)} placeholder="Years" className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none" />
                  </div>
                </>
              ) : null}
              {activeTool === "roi" || activeTool === "rental" ? (
                <>
                  <input type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} placeholder="Property price" className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none" />
                  {activeTool === "roi" ? (
                    <input type="number" value={expectedValue} onChange={(e) => setExpectedValue(e.target.value)} placeholder="Expected value" className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none" />
                  ) : (
                    <input type="number" value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)} placeholder="Monthly rent" className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none" />
                  )}
                </>
              ) : null}
              {activeTool === "afford" ? (
                <>
                  <input type="number" value={monthlyIncome} onChange={(e) => setMonthlyIncome(e.target.value)} placeholder="Monthly income" className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none" />
                  <input type="number" value={tenure} onChange={(e) => setTenure(e.target.value)} placeholder="Loan tenure (years)" className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none" />
                </>
              ) : null}
            </div>
            <div className="flex flex-col justify-center rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-neutral-500">Result</p>
              <p className="mt-2 text-4xl font-extrabold text-neutral-900">{resultLabel}</p>
              <Link
                href={`/ask?q=${encodeURIComponent(`Validate my ${activeTool} calculation for Tricity property`)}`}
                className="mt-6 inline-flex justify-center rounded-xl py-3 text-sm font-bold text-white"
                style={{ backgroundColor: IQ_GREEN }}
              >
                Validate with AreaIQ →
              </Link>
            </div>
          </motion.div>
        ) : null}
      </div>
    </section>
  );
}
