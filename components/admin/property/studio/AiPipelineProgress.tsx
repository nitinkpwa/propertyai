"use client";

import { motion } from "framer-motion";
import { AI_PIPELINE_STEPS } from "@/lib/admin/property/studio/types";

interface Props {
  activeIndex: number;
  completed: boolean;
}

export default function AiPipelineProgress({ activeIndex, completed }: Props) {
  return (
    <div className="mx-auto max-w-lg rounded-[28px] border border-white/70 bg-white/80 p-8 shadow-[0_20px_50px_-24px_rgba(50,111,26,0.4)] backdrop-blur-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
        AreaIQ AI Pipeline
      </p>
      <h2 className="mt-2 text-2xl font-bold text-heading-primary">
        {completed ? "Completed." : "Creating your listing…"}
      </h2>
      <p className="mt-1 text-sm text-muted">
        Extracting structured intelligence from your marketing material.
      </p>

      <ol className="mt-8 space-y-3">
        {AI_PIPELINE_STEPS.map((step, index) => {
          const done = completed || index < activeIndex;
          const active = !completed && index === activeIndex;
          return (
            <motion.li
              key={step.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.04 }}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
                active ? "bg-emerald-50" : done ? "bg-transparent" : "opacity-40"
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  done
                    ? "bg-emerald-500 text-white"
                    : active
                      ? "border-2 border-emerald-500 text-emerald-600"
                      : "border border-neutral-200 text-muted"
                }`}
              >
                {done ? "✓" : index + 1}
              </span>
              <span
                className={`text-sm ${active ? "font-semibold text-heading-primary" : "text-body"}`}
              >
                {step.label}
              </span>
              {active ? (
                <motion.span
                  className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.1 }}
                />
              ) : null}
            </motion.li>
          );
        })}
      </ol>

      <div className="mt-8 h-1.5 overflow-hidden rounded-full bg-neutral-100">
        <motion.div
          className="h-full rounded-full bg-emerald-500"
          initial={{ width: "0%" }}
          animate={{
            width: completed
              ? "100%"
              : `${Math.min(96, ((activeIndex + 0.35) / AI_PIPELINE_STEPS.length) * 100)}%`,
          }}
          transition={{ duration: 0.4 }}
        />
      </div>
    </div>
  );
}
