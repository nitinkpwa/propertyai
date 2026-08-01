"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { MapPinned, Sparkles } from "lucide-react";
import LiveActivityTicker from "./LiveActivityTicker";
import IntelligenceDrawer from "./IntelligenceDrawer";
import MapMiniCharts from "./MapMiniCharts";
import { SkeletonBlock, TerminalSectionHeader } from "./primitives";
import { useTerminalData } from "./useTerminalData";
import { mapRenderableListings } from "@/lib/home/areaListingMarkers";
import { IQ_GREEN } from "../theme";

const IntelligenceMap = dynamic(() => import("./IntelligenceMap"), {
  ssr: false,
  loading: () => <SkeletonBlock className="h-[420px] sm:h-[480px]" />,
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

  const exploreHref = selected
    ? `/intelligence-map?area=${encodeURIComponent(selected.id)}`
    : "/intelligence-map";

  return (
    <section className="border-y border-neutral-100 bg-[#F7F9FB]">
      {bundle ? <LiveActivityTicker items={bundle.activity} /> : null}

      <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <TerminalSectionHeader
          eyebrow="Market preview"
          title="Tricity Intelligence Map"
          action={{ label: "Open full map", href: exploreHref }}
        />

        <p className="mb-5 max-w-2xl text-sm leading-relaxed text-muted">
          Browse areas and tap verified listings. Scroll the page freely — full
          pan, filters, and exploration tools live on the dedicated map.
        </p>

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

        {/* Dashboard preview layout */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(300px,3fr)] lg:items-stretch">
          <div className="min-w-0 space-y-3">
            {loading && !layers ? (
              <SkeletonBlock className="h-[420px] sm:h-[480px]" />
            ) : layers ? (
              <IntelligenceMap
                variant="preview"
                nodes={nodes}
                layers={layers}
                activeId={selected?.id ?? null}
                selectedPropertyId={selectedPropertyId}
                onSelect={selectArea}
                onSelectProperty={setSelectedPropertyId}
              />
            ) : (
              <SkeletonBlock className="h-[420px] sm:h-[480px]" />
            )}

            {/* Primary CTA — homepage discovery → dedicated exploration */}
            <Link
              href={exploreHref}
              className="group relative flex items-center justify-between gap-4 overflow-hidden rounded-2xl px-5 py-4 text-white no-underline shadow-[0_12px_36px_rgba(50,111,26,0.28)] transition-transform hover:-translate-y-0.5 sm:px-6 sm:py-5"
              style={{
                background:
                  "linear-gradient(135deg, #326F1A 0%, #4AAA27 55%, #6BCB3C 100%)",
              }}
            >
              <div className="relative z-[1] min-w-0">
                <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/85">
                  <Sparkles className="h-3 w-3" aria-hidden />
                  Premium exploration
                </p>
                <p className="mt-1 text-lg font-bold tracking-tight sm:text-xl">
                  Open Full Intelligence Map
                </p>
                <p className="mt-0.5 text-xs text-white/85 sm:text-sm">
                  Full pan, search, filters, heatmaps, builders & AI insights
                </p>
              </div>
              <span className="relative z-[1] inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur transition-transform group-hover:scale-105">
                <MapPinned className="h-5 w-5" aria-hidden />
              </span>
            </Link>
          </div>

          <div className="min-w-0 lg:h-[480px]">
            <div className="h-full min-h-[420px] lg:min-h-0">
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
