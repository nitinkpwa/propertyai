"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import FadeIn from "../FadeIn";
import SectionHeader from "../SectionHeader";
import GlassCard from "../ui/GlassCard";
import { ECOSYSTEM_ROLES } from "../data";
import { IQ_GREEN } from "../theme";

export default function EcosystemSection() {
  return (
    <section className="border-t border-neutral-100 bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionHeader
            eyebrow="Ecosystem"
            title="One Platform. Every Role."
            description="AreaIQ connects buyers, sellers, builders, partners, and admins in one intelligent ecosystem."
          />
        </FadeIn>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {ECOSYSTEM_ROLES.map((role, i) => (
            <motion.div
              key={role.role}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
            >
              <GlassCard href={role.href} className="flex h-full flex-col p-5">
                <span className="text-2xl">{role.icon}</span>
                <h3 className="mt-3 font-bold text-heading-primary">{role.role}</h3>
                <p className="mt-1 flex-1 text-xs leading-relaxed text-muted">{role.desc}</p>
                <div className="mt-4 flex flex-wrap gap-1">
                  {role.features.map((f) => (
                    <span key={f} className="rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-body">
                      {f}
                    </span>
                  ))}
                </div>
                <span className="mt-4 text-xs font-bold" style={{ color: IQ_GREEN }}>
                  {role.cta} →
                </span>
              </GlassCard>
            </motion.div>
          ))}
        </div>
        <p className="mt-10 text-center text-sm text-muted">
          New here?{" "}
          <Link href="/register" className="font-semibold no-underline" style={{ color: IQ_GREEN }}>
            Create an account
          </Link>
          {" · "}
          <Link href="/login" className="font-semibold text-body no-underline hover:text-heading-primary">
            Sign in
          </Link>
        </p>
      </div>
    </section>
  );
}
