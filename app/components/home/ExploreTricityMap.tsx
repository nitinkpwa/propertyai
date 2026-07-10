"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";
import FadeIn from "./FadeIn";
import SectionHeader from "./SectionHeader";
import { EXPLORE_AREAS } from "./data";
import { IQ_GREEN } from "./theme";

export default function ExploreTricityMap() {
  const [active, setActive] = useState(EXPLORE_AREAS[0]?.name ?? "Mohali");
  const selected = EXPLORE_AREAS.find((a) => a.name === active) ?? EXPLORE_AREAS[0];

  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionHeader
            eyebrow="Explore"
            title="Explore Tricity"
            description="Tap a zone to browse listings — heat intensity reflects AreaIQ demand signals."
            action={{
              label: "Area analysis",
              href: `/ask?q=${encodeURIComponent(`${selected?.name} area intelligence`)}`,
            }}
          />
        </FadeIn>

        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-neutral-200/80 bg-gradient-to-br from-emerald-50 via-white to-sky-50 shadow-[0_20px_60px_rgba(0,0,0,0.06)]"
          >
            {EXPLORE_AREAS.map((area, i) => {
              const positions = [
                { left: "55%", top: "42%" },
                { left: "45%", top: "58%" },
                { left: "50%", top: "50%" },
                { left: "62%", top: "55%" },
                { left: "48%", top: "22%" },
                { left: "35%", top: "38%" },
              ];
              const pos = positions[i] ?? { left: "50%", top: "50%" };
              return (
                <button
                  key={area.name}
                  type="button"
                  onClick={() => setActive(area.name)}
                  className={`absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[11px] font-bold transition-all sm:h-12 sm:w-12 ${
                    active === area.name
                      ? "z-10 scale-110 text-white shadow-[0_0_0_4px_rgba(22,199,132,0.25)]"
                      : "border-2 border-white bg-white/90 text-body shadow-md hover:scale-105"
                  }`}
                  style={{
                    left: pos.left,
                    top: pos.top,
                    backgroundColor: active === area.name ? IQ_GREEN : undefined,
                  }}
                >
                  {area.score}
                </button>
              );
            })}
            <div className="absolute bottom-4 left-4 rounded-xl border border-neutral-200/80 bg-white/90 px-3 py-2 text-xs text-muted backdrop-blur-sm">
              Demand score · tap to explore
            </div>
          </motion.div>

          <FadeIn delay={0.1}>
            <div className="rounded-2xl border border-neutral-200/80 bg-[#F7F9FB] p-6 sm:p-8">
              <p className="text-sm font-medium text-muted">Selected area</p>
              <h3 className="mt-1 text-3xl font-bold text-heading-primary">{selected?.name}</h3>
              <p className="mt-2 text-sm text-body">
                AreaIQ demand score:{" "}
                <strong style={{ color: IQ_GREEN }}>{selected?.score}/100</strong>
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {EXPLORE_AREAS.map((area) => (
                  <button
                    key={area.name}
                    type="button"
                    onClick={() => setActive(area.name)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                      active === area.name
                        ? "text-white shadow-md"
                        : "bg-white text-body hover:bg-white/80"
                    }`}
                    style={
                      active === area.name ? { backgroundColor: IQ_GREEN } : undefined
                    }
                  >
                    {area.name}
                  </button>
                ))}
              </div>
              <Link
                href={selected?.href ?? "/properties"}
                className="mt-6 inline-flex rounded-xl px-6 py-3 text-sm font-bold text-white shadow-md transition-transform hover:scale-[1.02]"
                style={{ backgroundColor: IQ_GREEN }}
              >
                View listings in {selected?.name} →
              </Link>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
