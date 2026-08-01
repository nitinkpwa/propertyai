"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  Filter,
  Layers,
  MapPin,
  MessageSquare,
  PenLine,
  RotateCcw,
  Route,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import IntelligenceDrawer from "./IntelligenceDrawer";
import { SkeletonBlock } from "./primitives";
import { useTerminalData } from "./useTerminalData";
import {
  buildAreaMapSummary,
  mapRenderableListings,
} from "@/lib/home/areaListingMarkers";
import { IQ_GREEN, MAP_GLASS_STYLE } from "../theme";
import type { MapPointFeature } from "@/lib/home/terminalTypes";

const IntelligenceMap = dynamic(() => import("./IntelligenceMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[#E8ECE9] text-sm text-neutral-500">
      Loading map…
    </div>
  ),
});

type ToolId = "navigate" | "measure";
type PriceFilter = "any" | "under50" | "50to100" | "over100";
type BhkFilter = "any" | "2" | "3" | "4plus";

function matchesFilters(
  listing: MapPointFeature,
  q: string,
  price: PriceFilter,
  bhk: BhkFilter,
  verifiedOnly: boolean,
): boolean {
  if (verifiedOnly && !listing.verified) return false;
  if (q) {
    const hay = `${listing.name} ${listing.builderName ?? ""}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  const p = listing.price ?? null;
  if (price === "under50" && (p == null || p >= 50_00_000)) return false;
  if (price === "50to100" && (p == null || p < 50_00_000 || p > 1_00_00_000))
    return false;
  if (price === "over100" && (p == null || p <= 1_00_00_000)) return false;
  const b = listing.bhk ?? null;
  if (bhk === "2" && b !== 2) return false;
  if (bhk === "3" && b !== 3) return false;
  if (bhk === "4plus" && (b == null || b < 4)) return false;
  return true;
}

const glassPanel = {
  ...MAP_GLASS_STYLE,
  borderRadius: "28px",
} as const;

const glassCircle = {
  ...MAP_GLASS_STYLE,
  borderRadius: "999px",
} as const;

const easeOut = [0.22, 1, 0.36, 1] as const;

export default function IntelligenceMapExplorer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading, bundle } = useTerminalData();
  const nodes = bundle?.mapNodes ?? [];
  const baseLayers = bundle?.mapLayers;

  const initialArea = searchParams.get("area");
  const [activeId, setActiveId] = useState<string | null>(initialArea ?? "mohali");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("any");
  const [bhkFilter, setBhkFilter] = useState<BhkFilter>("any");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(true);
  const [tool, setTool] = useState<ToolId>("navigate");
  const [measureLabel, setMeasureLabel] = useState<string | null>(null);
  const [layerPreset, setLayerPreset] = useState<
    "inventory" | "heat" | "builders" | "infra"
  >("inventory");

  useEffect(() => {
    if (!initialArea || nodes.length === 0) return;
    if (nodes.some((n) => n.id === initialArea)) setActiveId(initialArea);
  }, [initialArea, nodes]);

  const selected =
    (activeId ? nodes.find((n) => n.id === activeId) : null) ??
    nodes[0] ??
    null;

  const filteredLayers = useMemo(() => {
    if (!baseLayers) return null;
    const q = query.trim().toLowerCase();
    const filterList = (list: MapPointFeature[]) =>
      list.filter((l) =>
        matchesFilters(l, q, priceFilter, bhkFilter, verifiedOnly),
      );
    return {
      ...baseLayers,
      verifiedListings: filterList(baseLayers.verifiedListings),
      premiumProjects: filterList(baseLayers.premiumProjects),
    };
  }, [baseLayers, query, priceFilter, bhkFilter, verifiedOnly]);

  const areaListings = useMemo(
    () =>
      mapRenderableListings(
        filteredLayers?.verifiedListings ?? [],
        selected,
        selected?.id ?? null,
      ).primary,
    [filteredLayers?.verifiedListings, selected],
  );

  const selectedListing = useMemo(() => {
    if (!selectedPropertyId) return null;
    return (
      areaListings.find((l) => l.propertyId === selectedPropertyId) ??
      filteredLayers?.verifiedListings.find(
        (l) => l.propertyId === selectedPropertyId,
      ) ??
      null
    );
  }, [selectedPropertyId, areaListings, filteredLayers?.verifiedListings]);

  const selectArea = (id: string) => {
    setActiveId(id);
    setSelectedPropertyId(null);
    router.replace(`/intelligence-map?area=${encodeURIComponent(id)}`, {
      scroll: false,
    });
  };

  const askHref = selected
    ? `/ask?q=${encodeURIComponent(`${selected.name} area intelligence and investment outlook`)}`
    : "/ask?q=Tricity+market+intelligence";

  const activeFilterCount =
    (priceFilter !== "any" ? 1 : 0) +
    (bhkFilter !== "any" ? 1 : 0) +
    (verifiedOnly ? 1 : 0) +
    (query.trim() ? 1 : 0);

  const areaSummary = useMemo(
    () => buildAreaMapSummary(selected, areaListings),
    [selected, areaListings],
  );

  return (
    <div className="fixed inset-0 z-[40] bg-[#EEF1EF] text-neutral-900">
      {/* Map hero — ~70% visual weight, rounded outer shell only */}
      <div
        className={`absolute bottom-3 left-3 right-3 top-3 overflow-hidden rounded-[26px] shadow-[0_8px_32px_rgba(15,23,42,0.08)] lg:bottom-4 lg:left-4 lg:top-[calc(var(--chrome-top)+1rem)] ${
          insightsOpen
            ? "lg:right-[calc(min(400px,30vw)+1.75rem)]"
            : "lg:right-4"
        }`}
      >
        {filteredLayers ? (
          <IntelligenceMap
            variant="explore"
            hideChrome
            layerPreset={layerPreset}
            activeTool={tool}
            onMeasureChange={setMeasureLabel}
            nodes={nodes}
            layers={filteredLayers}
            activeId={selected?.id ?? null}
            selectedPropertyId={selectedPropertyId}
            onSelect={selectArea}
            onSelectProperty={setSelectedPropertyId}
            floatCardClassName={
              insightsOpen
                ? "!fixed z-[12] max-sm:!bottom-[calc(46vh+0.85rem)] sm:!bottom-8 sm:!left-8"
                : "!fixed z-[12] !bottom-8 !left-7 sm:!left-8"
            }
            className="h-full rounded-none border-0 shadow-none"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[#E8ECE9] text-sm text-neutral-500">
            {loading ? "Loading intelligence…" : "No map data available"}
          </div>
        )}
      </div>

      {/* ── Top floating chrome ── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[10] px-5 pt-5 lg:top-chrome lg:pt-6">
        <div
          className={`mx-auto flex flex-col gap-3 ${
            insightsOpen
              ? "lg:max-w-none lg:pr-[calc(min(400px,30vw)+1.5rem)]"
              : ""
          }`}
        >
          <div className="pointer-events-auto flex items-center gap-2.5">
            <Link
              href="/"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center text-neutral-800 no-underline transition-transform duration-200 hover:scale-105 active:scale-95"
              style={glassCircle}
              aria-label="Back to homepage"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div
              className="flex min-w-0 flex-1 items-center gap-3 px-3.5 py-2 sm:px-4"
              style={{ ...glassPanel, borderRadius: "24px" }}
            >
              <div className="min-w-0 hidden sm:block">
                <p className="text-[10px] font-normal uppercase tracking-[0.16em] text-neutral-400">
                  AreaIQ
                </p>
                <h1 className="truncate text-[14px] font-semibold tracking-tight text-neutral-900">
                  Intelligence Map
                </h1>
              </div>

              <label className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search projects, builders…"
                  className="w-full rounded-[16px] border-0 bg-black/[0.035] py-2 pl-9 pr-3 text-[13px] font-medium text-neutral-900 outline-none placeholder:font-normal placeholder:text-neutral-400 focus:bg-black/[0.05]"
                />
              </label>

              <button
                type="button"
                onClick={() => setFiltersOpen((v) => !v)}
                className={`inline-flex h-9 items-center gap-1.5 rounded-[16px] px-3 text-[12px] font-medium transition-all duration-200 ${
                  filtersOpen || activeFilterCount > 0
                    ? "bg-neutral-900 text-white"
                    : "bg-black/[0.035] text-neutral-600 hover:bg-black/[0.06]"
                }`}
              >
                <Filter className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Filters</span>
                {activeFilterCount > 0 ? (
                  <span className="inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-white/20 px-1 text-[10px] font-semibold">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>

              <Link
                href={askHref}
                className="hidden h-9 items-center gap-1.5 rounded-[16px] px-3.5 text-[12px] font-semibold text-white no-underline shadow-sm transition-transform duration-200 hover:scale-[1.02] sm:inline-flex"
                style={{ backgroundColor: IQ_GREEN }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Ask
              </Link>
            </div>
          </div>

          {/* Area segmented control + layer chips */}
          <div className="pointer-events-auto flex items-center gap-2.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div
              className="inline-flex items-center gap-0.5 p-1"
              style={{ ...glassPanel, borderRadius: "999px" }}
            >
              {loading && nodes.length === 0
                ? Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonBlock
                      key={i}
                      className="h-9 w-20 shrink-0 rounded-full bg-black/5"
                    />
                  ))
                : nodes.map((n) => {
                    const on = n.id === selected?.id;
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => selectArea(n.id)}
                        className={`relative shrink-0 rounded-full px-4 py-2 text-[13px] tracking-tight transition-all duration-200 ${
                          on
                            ? "scale-[1.02] font-semibold text-white"
                            : "font-medium text-neutral-500 hover:text-neutral-800"
                        }`}
                      >
                        {on ? (
                          <motion.span
                            layoutId="area-seg"
                            className="absolute inset-0 rounded-full"
                            style={{
                              background:
                                "linear-gradient(135deg, #5BBF35 0%, #4AAA27 55%, #3D9620 100%)",
                              boxShadow:
                                "0 4px 18px rgba(74,170,39,0.32), 0 0 0 1px rgba(74,170,39,0.15)",
                            }}
                            transition={{ duration: 0.22, ease: easeOut }}
                          />
                        ) : null}
                        <span className="relative z-[1]">{n.name}</span>
                      </button>
                    );
                  })}
            </div>

            <div
              className="ml-auto hidden items-center gap-1 p-1 md:inline-flex"
              style={{ ...glassPanel, borderRadius: "999px" }}
            >
              {(
                [
                  ["inventory", "Inventory", Layers],
                  ["heat", "Heatmap", Sparkles],
                  ["builders", "Builders", Building2],
                  ["infra", "Infrastructure", Route],
                ] as const
              ).map(([id, label, Icon]) => {
                const on = layerPreset === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setLayerPreset(id)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] transition-all duration-200 ${
                      on
                        ? "bg-neutral-900 font-semibold text-white shadow-sm"
                        : "font-medium text-neutral-500 hover:text-neutral-800"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 opacity-70" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Left floating area intelligence mini-card */}
          {areaSummary && selected ? (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: easeOut }}
              className="pointer-events-auto hidden w-[240px] p-4 sm:block"
              style={{ ...glassPanel, borderRadius: "24px" }}
            >
              <div className="flex items-start gap-2">
                <MapPin
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400"
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold tracking-tight text-neutral-900">
                    {areaSummary.name}
                  </p>
                  <p className="mt-0.5 text-[12px] font-normal text-neutral-400">
                    {areaSummary.mappedCount} listing
                    {areaSummary.mappedCount === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div>
                  <p className="text-[9px] font-normal uppercase tracking-[0.12em] text-neutral-400">
                    Avg price
                  </p>
                  <p className="mt-1 text-[12px] font-semibold tabular-nums text-neutral-900">
                    {areaSummary.averagePriceLabel}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-normal uppercase tracking-[0.12em] text-neutral-400">
                    Best
                  </p>
                  <p
                    className="mt-1 text-[12px] font-semibold tabular-nums"
                    style={{ color: IQ_GREEN }}
                  >
                    {areaSummary.bestScoreLabel}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-normal uppercase tracking-[0.12em] text-neutral-400">
                    Builders
                  </p>
                  <p className="mt-1 text-[12px] font-semibold tabular-nums text-neutral-900">
                    {areaSummary.builderCount}
                  </p>
                </div>
              </div>
              <Link
                href={selected.listingsHref}
                className="mt-4 inline-flex text-[12px] font-medium text-neutral-800 no-underline transition-opacity duration-200 hover:opacity-60"
              >
                View Area →
              </Link>
            </motion.div>
          ) : null}

          {/* Filters popover */}
          <AnimatePresence>
            {filtersOpen ? (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-auto max-w-xl p-5"
                style={glassPanel}
              >
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                    Filters
                  </p>
                  <button
                    type="button"
                    onClick={() => setFiltersOpen(false)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition hover:bg-black/5 hover:text-neutral-700"
                    aria-label="Close filters"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["any", "Any price"],
                      ["under50", "Under ₹50L"],
                      ["50to100", "₹50–100L"],
                      ["over100", "₹1Cr+"],
                    ] as const
                  ).map(([id, label]) => (
                    <FilterChip
                      key={id}
                      active={priceFilter === id}
                      onClick={() => setPriceFilter(id)}
                      label={label}
                    />
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(
                    [
                      ["any", "Any BHK"],
                      ["2", "2 BHK"],
                      ["3", "3 BHK"],
                      ["4plus", "4+ BHK"],
                    ] as const
                  ).map(([id, label]) => (
                    <FilterChip
                      key={id}
                      active={bhkFilter === id}
                      onClick={() => setBhkFilter(id)}
                      label={label}
                    />
                  ))}
                  <FilterChip
                    active={verifiedOnly}
                    onClick={() => setVerifiedOnly((v) => !v)}
                    label="Verified"
                    accent
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setPriceFilter("any");
                      setBhkFilter("any");
                      setVerifiedOnly(false);
                    }}
                    className="inline-flex items-center gap-1 rounded-[14px] px-3 py-2 text-[12px] font-medium text-neutral-500 transition hover:bg-black/5 hover:text-neutral-800"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Tools — floating circles ── */}
      <div
        className={`absolute bottom-28 right-6 z-[8] flex flex-col gap-2 sm:bottom-8 ${
          insightsOpen
            ? "lg:right-[calc(min(400px,30vw)+2rem)]"
            : "lg:right-8"
        }`}
      >
        <ToolCircle
          active={tool === "navigate"}
          onClick={() => setTool("navigate")}
          title="Navigate"
        >
          <Layers className="h-4 w-4" />
        </ToolCircle>
        <ToolCircle
          active={tool === "measure"}
          onClick={() => setTool("measure")}
          title="Measure distance"
        >
          <PenLine className="h-4 w-4" />
        </ToolCircle>
      </div>

      {tool === "measure" ? (
        <div
          className={`absolute bottom-28 z-[8] max-w-[200px] px-4 py-2.5 text-[12px] font-medium text-neutral-600 sm:bottom-8 ${
            insightsOpen
              ? "right-20 lg:right-[calc(min(400px,30vw)+5.5rem)]"
              : "right-20 lg:right-24"
          }`}
          style={{ ...glassPanel, borderRadius: "20px" }}
        >
          {measureLabel
            ? `Distance: ${measureLabel}`
            : "Tap two points on the map"}
        </div>
      ) : null}

      {/* ── Insights panel (~30%) ── */}
      <aside
        className={`absolute z-[9] flex flex-col overflow-hidden transition-all duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          insightsOpen
            ? "inset-x-3 bottom-3 max-h-[46vh] sm:inset-x-auto sm:bottom-4 sm:right-4 sm:top-auto sm:h-[min(740px,calc(100%-6rem))] sm:max-h-none sm:w-[min(400px,30vw)] lg:top-[calc(var(--chrome-top)+1rem)] lg:bottom-4"
            : "pointer-events-none opacity-0"
        }`}
        style={
          insightsOpen
            ? { ...glassPanel, borderRadius: "28px" }
            : undefined
        }
      >
        {insightsOpen ? (
          <>
            <div className="flex shrink-0 items-center justify-between px-6 pb-1 pt-5">
              <div className="min-w-0">
                <p className="text-[10px] font-normal uppercase tracking-[0.16em] text-neutral-400">
                  Intelligence
                </p>
                <p className="truncate text-[17px] font-semibold tracking-tight text-neutral-900">
                  {selected?.name ?? "Select an area"}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Link
                  href={askHref}
                  className="inline-flex h-8 items-center gap-1.5 rounded-[16px] bg-neutral-900 px-3 text-[11px] font-medium text-white no-underline transition duration-200 hover:bg-neutral-800"
                >
                  <MessageSquare className="h-3 w-3" />
                  Ask
                </Link>
                <button
                  type="button"
                  onClick={() => setInsightsOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-neutral-400 transition hover:bg-black/5 hover:text-neutral-700"
                  aria-label="Close insights"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden px-2 pb-2 [&_>div]:h-full [&_>div]:rounded-[20px] [&_>div]:border-0 [&_>div]:bg-transparent [&_>div]:shadow-none">
              <IntelligenceDrawer
                node={selected}
                listings={areaListings}
                selectedListing={selectedListing}
                onSelectListing={setSelectedPropertyId}
                variant="floating"
              />
            </div>
          </>
        ) : null}
      </aside>

      {!insightsOpen ? (
        <button
          type="button"
          onClick={() => setInsightsOpen(true)}
          className="absolute bottom-6 right-6 z-[8] inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-neutral-900 shadow-sm transition-transform duration-200 hover:scale-[1.02] active:scale-95"
          style={{ ...glassPanel, borderRadius: "999px" }}
        >
          <Sparkles className="h-3.5 w-3.5" style={{ color: IQ_GREEN }} />
          Insights
        </button>
      ) : null}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[14px] px-3.5 py-2 text-[12px] font-medium transition-all duration-200 ${
        active
          ? accent
            ? "bg-[#4AAA27] text-white shadow-[0_4px_14px_rgba(74,170,39,0.3)]"
            : "bg-neutral-900 text-white"
          : "bg-black/[0.04] text-neutral-600 hover:bg-black/[0.07]"
      }`}
    >
      {label}
    </button>
  );
}

function ToolCircle({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex h-11 w-11 items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 ${
        active ? "text-white" : "text-neutral-800"
      }`}
      style={
        active
          ? {
              borderRadius: "999px",
              backgroundColor: "#111827",
              boxShadow: "0 6px 18px rgba(15,23,42,0.12)",
            }
          : glassCircle
      }
    >
      {children}
    </button>
  );
}
