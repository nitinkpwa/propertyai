"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import FadeIn from "../FadeIn";
import SectionHeader from "../SectionHeader";
import { AI_CONVERSATION_EXAMPLES } from "../data";
import { IQ_GREEN } from "../theme";

export default function AIAssistantShowcase() {
  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <SectionHeader
            eyebrow="AI Advisor"
            title="Talk to Your Property Advisor"
            description="Real questions Tricity buyers ask — answered with intelligence, not listings."
            action={{ label: "Start conversation", href: "/ask" }}
          />
        </FadeIn>

        <div className="grid gap-6 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.06)]"
          >
            <div className="flex items-center gap-3 border-b border-neutral-100 bg-[#F7F9FB] px-5 py-3.5">
              <div className="flex gap-1.5">
                {["#FF5F57", "#FFBD2E", "#28CA42"].map((c) => (
                  <div key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
                ))}
              </div>
              <span className="text-sm font-medium text-body">AreaIQ AI Assistant</span>
            </div>
            <div className="max-h-[420px] space-y-4 overflow-y-auto p-5">
              {AI_CONVERSATION_EXAMPLES.slice(0, 5).map((ex) => (
                <div key={ex.q}>
                  <div className="flex justify-end">
                    <div
                      className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm text-white"
                      style={{ backgroundColor: IQ_GREEN }}
                    >
                      {ex.q}
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs text-white">
                      ✦
                    </div>
                    <div className="rounded-2xl rounded-bl-md bg-[#F7F9FB] px-4 py-2.5 text-sm leading-relaxed text-body">
                      {ex.a}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-neutral-100 p-4">
              <Link
                href="/ask"
                className="block rounded-xl bg-neutral-900 py-3 text-center text-sm font-semibold text-white no-underline hover:bg-neutral-800"
              >
                Ask your question →
              </Link>
            </div>
          </motion.div>

          <div className="grid gap-2 sm:grid-cols-2 content-start">
            {AI_CONVERSATION_EXAMPLES.map((ex, i) => (
              <motion.div
                key={ex.q}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.03 }}
              >
                <Link
                  href={`/ask?q=${encodeURIComponent(ex.q)}`}
                  className="block rounded-xl border border-neutral-200/80 bg-[#F7F9FB] px-4 py-3 text-sm font-medium text-label no-underline transition-all hover:border-emerald-200 hover:bg-white hover:shadow-sm"
                >
                  {ex.q}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
