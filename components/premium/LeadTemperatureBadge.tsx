"use client";

import type { LeadTemperature } from "@/lib/crm/leadScore";
import { temperatureLabel, temperatureStyles } from "@/lib/crm/leadScore";

export default function LeadTemperatureBadge({
  temperature,
  score,
}: {
  temperature: LeadTemperature;
  score?: number;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ${temperatureStyles(temperature)}`}
    >
      {temperature === "hot" ? "🔥" : temperature === "warm" ? "⚡" : "❄️"}
      {temperatureLabel(temperature)}
      {score != null ? <span className="font-normal opacity-75">· {score}</span> : null}
    </span>
  );
}
