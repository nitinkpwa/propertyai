"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  BadgeCheck,
  Building2,
  LineChart,
  ListChecks,
  Scale,
} from "lucide-react";
import type { LiveActivityItem } from "@/lib/home/terminalTypes";
import { IQ_GREEN } from "../theme";

const ICONS = {
  builder: Building2,
  rera: BadgeCheck,
  listing: ListChecks,
  legal: Scale,
  score: LineChart,
} as const;

export default function LiveActivityTicker({
  items,
}: {
  items: LiveActivityItem[];
}) {
  const reduce = useReducedMotion();
  if (items.length === 0) return null;

  const loop = [...items, ...items];

  return (
    <div className="relative overflow-hidden border-y border-neutral-200/80 bg-white">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-10 bg-gradient-to-r from-white to-transparent sm:w-16" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-10 bg-gradient-to-l from-white to-transparent sm:w-16" />
      <div className="flex items-center gap-3 px-2 py-2.5">
        <span
          className="shrink-0 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
          style={{ backgroundColor: IQ_GREEN }}
        >
          Live
        </span>
        <div className="min-w-0 flex-1 overflow-hidden">
          <motion.div
            className="flex w-max gap-8"
            animate={reduce ? undefined : { x: ["0%", "-50%"] }}
            transition={
              reduce
                ? undefined
                : { duration: 40, ease: "linear", repeat: Infinity }
            }
          >
            {loop.map((item, i) => {
              const Icon = ICONS[item.kind];
              return (
                <Link
                  key={`${item.id}-${i}`}
                  href={item.href}
                  className="inline-flex shrink-0 items-center gap-2 text-sm text-body no-underline hover:text-heading-primary"
                >
                  <Icon className="h-3.5 w-3.5 text-[#4AAA27]" aria-hidden />
                  <span className="font-semibold text-heading-primary">
                    {item.label}
                  </span>
                  <span className="text-muted">{item.detail}</span>
                </Link>
              );
            })}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
