"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import FadeIn from "../FadeIn";
import SectionHeader from "../SectionHeader";
import { PROPERTY_COMPARE_METRICS } from "../data";
import { IQ_GREEN } from "../theme";

export default function PropertyComparisonSection() {
  const router = useRouter();
  const [propertyA, setPropertyA] = useState("");
  const [propertyB, setPropertyB] = useState("");

  const compare = () => {
    const a = propertyA.trim();
    const b = propertyB.trim();
    if (a && b) {
      router.push(`/ask?q=${encodeURIComponent(`Compare ${a} vs ${b}`)}`);
    } else {
      router.push("/ask?q=Compare+two+properties+Tricity");
    }
  };

  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionHeader
            eyebrow="Compare"
            title="Property Comparison"
            description="Search any two properties — AreaIQ compares builder, location, ROI, and declares a winner."
          />
        </FadeIn>

        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-neutral-200/80 bg-[#F7F9FB] p-6 sm:p-8">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-label">
                  Property A
                </label>
                <input
                  value={propertyA}
                  onChange={(e) => setPropertyA(e.target.value)}
                  placeholder="e.g. Sushma Joynest"
                  className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div className="flex justify-center py-2 sm:py-0">
                <span className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-bold text-white">VS</span>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-label">
                  Property B
                </label>
                <input
                  value={propertyB}
                  onChange={(e) => setPropertyB(e.target.value)}
                  placeholder="e.g. Omaxe City"
                  className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={compare}
              className="mt-6 w-full rounded-xl py-3.5 text-sm font-bold text-white shadow-md transition-transform hover:scale-[1.01]"
              style={{ backgroundColor: IQ_GREEN }}
            >
              Compare with AI →
            </button>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {PROPERTY_COMPARE_METRICS.map((m) => (
              <span
                key={m}
                className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-body"
              >
                {m}
              </span>
            ))}
          </div>

          <p className="mt-6 text-center text-sm text-muted">
            Or try{" "}
            <Link href="/ask?q=Compare+Mohali+vs+Aerocity+investment" className="font-semibold no-underline" style={{ color: IQ_GREEN }}>
              Mohali vs Aerocity
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
