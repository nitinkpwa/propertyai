"use client";

import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import type { TricityMapNode } from "@/lib/home/terminalTypes";
import { IQ_GREEN } from "../theme";

const SOFT = "#A8D48E";
const MUTED = "#D1D5DB";

export default function MapMiniCharts({ nodes }: { nodes: TricityMapNode[] }) {
  const withData = nodes.filter((n) => n.hasIntelligence);

  const inventory = withData
    .map((n) => ({ name: n.name.replace("New Chandigarh", "New CHD"), value: n.listingCount }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const grades = ["A", "B", "C", "D"].map((g) => ({
    name: g,
    value: withData.filter((n) => n.investmentGrade === g).length,
  }));

  const legalAvg =
    withData
      .map((n) => n.legalConfidence)
      .filter((n): n is number => n != null)
      .reduce((a, b, _, arr) => a + b / arr.length, 0) || null;

  const mix = [
    {
      name: "Verified",
      value: withData.reduce((s, n) => s + n.verifiedCount, 0),
    },
    {
      name: "Other",
      value: Math.max(
        0,
        withData.reduce((s, n) => s + n.listingCount, 0) -
          withData.reduce((s, n) => s + n.verifiedCount, 0),
      ),
    },
  ];

  const scoreDist = withData
    .filter((n) => n.investmentScore != null)
    .map((n) => ({
      name: n.name.split(" ")[0] ?? n.name,
      value: n.investmentScore as number,
    }))
    .slice(0, 6);

  if (withData.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-200/80 bg-white px-4 py-6 text-center text-xs text-muted">
        Collecting Intelligence — charts unlock from live inventory.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <ChartCard title="Inventory mix">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={inventory} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-25} textAnchor="end" height={40} />
            <Tooltip />
            <Bar dataKey="value" fill={IQ_GREEN} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Investment grades">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={grades} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {grades.map((_, i) => (
                <Cell key={i} fill={i === 0 ? IQ_GREEN : i === 1 ? SOFT : MUTED} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Listing verification">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={mix}
              dataKey="value"
              nameKey="name"
              innerRadius={28}
              outerRadius={48}
              paddingAngle={2}
            >
              <Cell fill={IQ_GREEN} />
              <Cell fill={MUTED} />
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <p className="mt-1 text-center text-[10px] font-semibold text-muted">
          Legal avg {legalAvg != null ? `${Math.round(legalAvg)}%` : "—"}
        </p>
      </ChartCard>

      <ChartCard title="Score by area">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={scoreDist} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} />
            <Tooltip />
            <Bar dataKey="value" fill={SOFT} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-3 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{title}</p>
      <div className="mt-1 h-[120px] w-full">{children}</div>
    </div>
  );
}
