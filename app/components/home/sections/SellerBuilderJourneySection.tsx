"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import FadeIn from "../FadeIn";
import SectionHeader from "../SectionHeader";
import { SELLER_JOURNEY, BUILDER_JOURNEY } from "../data";
import { IQ_GREEN } from "../theme";

function JourneyTimeline({
  steps,
  ctaHref,
  ctaLabel,
}: {
  steps: Array<{ title: string; desc: string; href: string; icon: string }>;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <div>
      <div className="relative space-y-0">
        {steps.map((step, i) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
            className="relative flex gap-4 pb-8 last:pb-0"
          >
            {i < steps.length - 1 ? (
              <div className="absolute left-[19px] top-10 h-[calc(100%-16px)] w-px bg-neutral-200" />
            ) : null}
            <div
              className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base"
              style={{ backgroundColor: `${IQ_GREEN}18` }}
            >
              {step.icon}
            </div>
            <Link href={step.href} className="group min-w-0 flex-1 no-underline">
              <p className="font-semibold text-heading-primary group-hover:text-emerald-700">{step.title}</p>
              <p className="mt-0.5 text-sm text-muted">{step.desc}</p>
            </Link>
          </motion.div>
        ))}
      </div>
      <Link
        href={ctaHref}
        className="mt-8 inline-flex rounded-xl px-5 py-2.5 text-sm font-bold text-white no-underline"
        style={{ backgroundColor: IQ_GREEN }}
      >
        {ctaLabel} →
      </Link>
    </div>
  );
}

export default function SellerBuilderJourneySection() {
  return (
    <section className="bg-[#F7F9FB] py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2">
          <FadeIn>
            <SectionHeader
              eyebrow="For Sellers"
              title="Seller Journey"
              description="List once — AI handles description, pricing, SEO, and buyer routing."
            />
            <JourneyTimeline steps={SELLER_JOURNEY} ctaHref="/seller" ctaLabel="List your property" />
          </FadeIn>
          <FadeIn delay={0.1}>
            <SectionHeader
              eyebrow="For Builders"
              title="Builder Journey"
              description="Scale inventory with AI enrichment and Connect Partner lead routing."
            />
            <JourneyTimeline steps={BUILDER_JOURNEY} ctaHref="/seller" ctaLabel="Upload inventory" />
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
