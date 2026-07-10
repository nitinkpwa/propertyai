"use client";

import Link from "next/link";
import FadeIn from "../FadeIn";
import SectionHeader from "../SectionHeader";
import { IQ_GREEN } from "../theme";

const CONNECT_FEATURES = [
  { icon: "💬", label: "Buyer communication" },
  { icon: "📅", label: "Site visits" },
  { icon: "🤝", label: "Negotiation support" },
  { icon: "📋", label: "Status updates" },
  { icon: "🔗", label: "CRM integration" },
];

export default function ConnectSection() {
  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-neutral-200/80 bg-gradient-to-br from-[#F7F9FB] to-white p-8 sm:p-12 lg:p-16">
          <FadeIn>
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <SectionHeader
                  eyebrow="AreaIQ Connect"
                  title="One Property. One Partner."
                  description="Every listing gets a dedicated Connect Partner who handles the entire buyer journey — so you get intelligence, not chaos."
                />
                <div className="mt-6 flex flex-wrap gap-2">
                  {CONNECT_FEATURES.map((f) => (
                    <span
                      key={f.label}
                      className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-label"
                    >
                      <span>{f.icon}</span>
                      {f.label}
                    </span>
                  ))}
                </div>
                <Link
                  href="/connect"
                  className="mt-8 inline-flex rounded-xl px-6 py-3.5 text-sm font-bold text-white no-underline shadow-md transition-transform hover:scale-[1.02]"
                  style={{ backgroundColor: IQ_GREEN }}
                >
                  Learn about Connect →
                </Link>
              </div>
              <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-widest text-muted">How it works</p>
                <ol className="mt-4 space-y-4">
                  {[
                    "Property is listed on AreaIQ with structured facts",
                    "One verified Connect Partner is assigned",
                    "Partner manages all buyer inquiries & visits",
                    "You track everything in Connect CRM",
                  ].map((item, i) => (
                    <li key={item} className="flex gap-3 text-sm text-body">
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: IQ_GREEN }}
                      >
                        {i + 1}
                      </span>
                      {item}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
