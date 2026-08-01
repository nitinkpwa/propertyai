"use client";

import type { TricityMapNode } from "@/lib/home/terminalTypes";
import { IQ_GREEN } from "../theme";

const TONE: Record<string, string> = {
  green: "#4AAA27",
  yellow: "#D4A017",
  red: "#C45C4A",
  grey: "#9CA3AF",
};

/**
 * Last-resort visual map when MapLibre cannot initialize.
 * Uses PLACE_GRAPH-derived lat/lng projected into an SVG viewBox.
 */
export default function StaticTricityMapFallback({
  nodes,
  activeId,
  onSelect,
  reason,
}: {
  nodes: TricityMapNode[];
  activeId: string | null;
  onSelect: (id: string) => void;
  reason?: string;
}) {
  const lats = nodes.map((n) => n.lat);
  const lngs = nodes.map((n) => n.lng);
  const minLat = Math.min(...lats, 30.55);
  const maxLat = Math.max(...lats, 30.9);
  const minLng = Math.min(...lngs, 76.55);
  const maxLng = Math.max(...lngs, 76.9);
  const pad = 0.04;

  const project = (lat: number, lng: number) => {
    const x = ((lng - (minLng - pad)) / (maxLng - minLng + pad * 2)) * 100;
    const y = ((maxLat + pad - lat) / (maxLat - minLat + pad * 2)) * 75;
    return { x, y };
  };

  return (
    <div className="relative h-[720px] w-full overflow-hidden rounded-3xl border border-neutral-200/80 bg-gradient-to-br from-[#F7F9FB] via-white to-[#F3FAEF] sm:h-[780px]">
      <svg viewBox="0 0 100 75" className="h-full w-full" role="img" aria-label="Tricity static intelligence map">
        <rect width="100" height="75" fill="#F3F5F7" />
        <path
          d="M12 28 C30 12, 55 10, 78 22 C92 32, 94 52, 78 62 C58 74, 30 70, 16 52 C8 40, 6 34, 12 28 Z"
          fill="none"
          stroke="#C8EBB8"
          strokeWidth="0.5"
          strokeDasharray="1.5 1"
        />
        {nodes.map((n) => {
          const { x, y } = project(n.lat, n.lng);
          const selected = n.id === activeId;
          const r = 1.8 + Math.min(4, n.listingCount * 0.15);
          return (
            <g key={n.id} onClick={() => onSelect(n.id)} className="cursor-pointer">
              <circle
                cx={x}
                cy={y}
                r={r + 2.5}
                fill={TONE[n.zoneTone]}
                opacity={selected ? 0.25 : 0.12}
              />
              <circle
                cx={x}
                cy={y}
                r={selected ? r + 0.8 : r}
                fill={TONE[n.zoneTone]}
                stroke="#fff"
                strokeWidth="0.45"
              />
              <text
                x={x}
                y={y + r + 2.8}
                textAnchor="middle"
                fontSize="2.4"
                fontWeight={selected ? 700 : 500}
                fill="#1F2937"
              >
                {n.name}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-semibold text-muted shadow-sm">
        Static map{reason ? ` · ${reason}` : ""}
        <span className="ml-2" style={{ color: IQ_GREEN }}>
          Areas live
        </span>
      </div>
    </div>
  );
}
