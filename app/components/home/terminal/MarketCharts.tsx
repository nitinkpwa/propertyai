"use client";

import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { IQ_GREEN } from "../theme";
import { SkeletonBlock, TerminalSectionHeader } from "./primitives";
import { useTerminalData } from "./useTerminalData";

const CHART_GREEN = IQ_GREEN;
const CHART_SOFT = "#A8D48E";
const GRID = "#EEF1F4";

function ChartCard({
  title,
  children,
  empty,
}: {
  title: string;
  children: ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
        {title}
      </p>
      <div className="mt-3 h-48 w-full">
        {empty ? (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            —
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export default function MarketCharts() {
  const { loading, bundle } = useTerminalData();
  const charts = bundle?.charts;

  if (loading && !charts) {
    return (
      <div>
        <TerminalSectionHeader eyebrow="Charts" title="Market snapshot" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-56" />
          ))}
        </div>
      </div>
    );
  }

  const inventory = charts?.inventoryByArea ?? [];
  const priceBands = charts?.priceBands ?? [];
  const yields = charts?.yieldDistribution ?? [];
  const radials = charts?.scoreRadials ?? [];
  const confidence = charts?.marketConfidence ?? [];

  return (
    <div>
      <TerminalSectionHeader
        eyebrow="Charts"
        title="Market snapshot"
        action={{ label: "Briefing", href: "/ask?q=Tricity+market+charts" }}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <ChartCard title="Inventory by area" empty={inventory.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={inventory} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={48} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill={CHART_GREEN} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Price bands" empty={priceBands.every((p) => p.value === 0)}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={priceBands} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="value"
                stroke={CHART_GREEN}
                fill={CHART_SOFT}
                fillOpacity={0.45}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Rental yield mix" empty={yields.every((p) => p.value === 0)}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={yields} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {yields.map((_, i) => (
                  <Cell key={i} fill={i % 2 === 0 ? CHART_GREEN : CHART_SOFT} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Score mix" empty={radials.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              data={radials.map((r) => ({ ...r, fill: CHART_GREEN }))}
              innerRadius="20%"
              outerRadius="95%"
              startAngle={90}
              endAngle={-270}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar dataKey="value" background={{ fill: GRID }} cornerRadius={6} />
              <Tooltip />
            </RadialBarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Confidence by area"
          empty={confidence.length === 0}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={confidence} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={48} />
              <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="value"
                stroke={CHART_GREEN}
                fill={CHART_GREEN}
                fillOpacity={0.2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
