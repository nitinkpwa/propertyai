"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import LiveActivityTicker from "./LiveActivityTicker";
import IntelligenceDrawer from "./IntelligenceDrawer";
import MapMiniCharts from "./MapMiniCharts";
import { SkeletonBlock, TerminalSectionHeader } from "./primitives";
import { useTerminalData } from "./useTerminalData";
import { mapRenderableListings } from "@/lib/home/areaListingMarkers";
import { IQ_GREEN } from "../theme";

const IntelligenceMap = dynamic(() => import("./IntelligenceMap"), {
  ssr: false,
  loading: () => <SkeletonBlock className="h-[720px] sm:h-[780px]" />,
});

export default function TricityMapTerminal() {
  const { loading, bundle } = useTerminalData();
  const nodes = bundle?.mapNodes ?? [];
  const layers = bundle?.mapLayers;
  const [activeId, setActiveId] = useState<string | null>("mohali");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    null,
  );
  const selected =
    (activeId ? nodes.find((n) => n.id === activeId) : null) ??
    nodes[0] ??
    null;

  const areaListings = useMemo(
    () =>
      mapRenderableListings(
        layers?.verifiedListings ?? [],
        selected,
        selected?.id ?? null,
      ).primary,
    [layers?.verifiedListings, selected],
  );

  const selectedListing = useMemo(() => {
    if (!selectedPropertyId) return null;
    return (
      areaListings.find((l) => l.propertyId === selectedPropertyId) ??
      layers?.verifiedListings.find((l) => l.propertyId === selectedPropertyId) ??
      null
    );
  }, [selectedPropertyId, areaListings, layers?.verifiedListings]);

  const selectArea = (id: string) => {
    setActiveId(id);
    setSelectedPropertyId(null);
  };

  return (
    <section className="border-y border-neutral-100 bg-[#F7F9FB]">
      {bundle ? <LiveActivityTicker items={bundle.activity} /> : null}

      <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <TerminalSectionHeader
          eyebrow="Command Center"
          title="Tricity Intelligence Map"
          action={{ label: "Ask market", href: "/ask?q=Tricity+market+intelligence" }}
        />

        {/* Area chip rail */}
        <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
          {nodes.map((n) => {
            const on = n.id === selected?.id;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => selectArea(n.id)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  on
                    ? "text-white shadow-md"
                    : n.hasIntelligence
                      ? "bg-white text-body shadow-sm hover:bg-[#F3FAEF]"
                      : "bg-neutral-100 text-muted"
                }`}
                style={on ? { backgroundColor: IQ_GREEN } : undefined}
              >
                {n.name}
              </button>
            );
          })}
        </div>

        {/* 70 / 30 command layout */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(300px,3fr)] lg:items-stretch">
          <div className="min-w-0">
            {loading && !layers ? (
              <SkeletonBlock className="h-[720px] sm:h-[780px]" />
            ) : layers ? (
              <IntelligenceMap
                nodes={nodes}
                layers={layers}
                activeId={selected?.id ?? null}
                selectedPropertyId={selectedPropertyId}
                onSelect={selectArea}
                onSelectProperty={setSelectedPropertyId}
              />
            ) : (
              <SkeletonBlock className="h-[720px] sm:h-[780px]" />
            )}
          </div>

          <div className="min-w-0 lg:h-[780px]">
            <div className="h-full min-h-[520px] lg:min-h-0">
              <IntelligenceDrawer
                node={selected}
                listings={areaListings}
                selectedListing={selectedListing}
                onSelectListing={setSelectedPropertyId}
              />
            </div>
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#4AAA27]">
            Live derived analytics
          </p>
          {loading && nodes.length === 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-[148px]" />
              ))}
            </div>
          ) : (
            <MapMiniCharts nodes={nodes} />
          )}
        </div>
      </div>
    </section>
  );
}
