"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type TouchEvent,
} from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Eye, ShieldCheck, Star } from "lucide-react";
import type { MapPointFeature, TricityMapNode } from "@/lib/home/terminalTypes";
import { scoreBandColor } from "@/lib/home/areaListingMarkers";
import { selectBestPropertyCard } from "@/lib/home/bestPropertyCard";
import { formatInrAmount } from "@/lib/properties/pricingDisplay";

function listingMeta(listing: MapPointFeature) {
  const price =
    listing.price != null && listing.price > 0
      ? formatInrAmount(listing.price)
      : "—";
  const bhk =
    listing.bhk != null && listing.bhk > 0 ? `${listing.bhk} BHK` : null;
  const area =
    listing.areaSize != null && listing.areaSize > 0
      ? `${Math.round(listing.areaSize).toLocaleString("en-IN")} ${listing.areaUnit ?? "sqft"}`
      : null;
  return {
    price,
    specs: [bhk, area].filter(Boolean).join(" • "),
    scoreColor: scoreBandColor(listing.score),
  };
}

function preloadImage(url: string | null | undefined) {
  if (!url || typeof window === "undefined") return;
  const img = new window.Image();
  img.decoding = "async";
  img.src = url;
}

/** Compact Google Maps / Airbnb-style map preview — map stays the hero. */
export default function BestPropertyFloatCard({
  areaId,
  areaNode,
  areaListings,
  allListings,
  nearbyListings,
  selectedPropertyId,
  mapBusy = false,
  onSelectListing,
  hidden,
  className,
}: {
  areaId: string | null;
  areaNode: TricityMapNode | null;
  areaListings: MapPointFeature[];
  allListings: MapPointFeature[];
  nearbyListings: MapPointFeature[];
  selectedPropertyId?: string | null;
  /** True while user is panning/zooming — card fades. */
  mapBusy?: boolean;
  onSelectListing?: (propertyId: string) => void;
  hidden?: boolean;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [navDir, setNavDir] = useState<1 | -1>(1);
  const [fadeImage, setFadeImage] = useState<string | null>(null);
  const [incomingOpaque, setIncomingOpaque] = useState(true);
  const touchStartX = useRef<number | null>(null);
  const prevImageRef = useRef<string | null>(null);
  const navRef = useRef({
    canNavigate: false,
    activeIndex: 0,
    ranked: [] as MapPointFeature[],
  });

  const selection = useMemo(
    () =>
      selectBestPropertyCard({
        areaId,
        areaNode,
        areaListings,
        allListings,
        nearbyListings,
        selectedPropertyId,
        hidden,
      }),
    [
      areaId,
      areaNode,
      areaListings,
      allListings,
      nearbyListings,
      selectedPropertyId,
      hidden,
    ],
  );

  const { best, ranked, nearest, diag } = selection;
  const canNavigate = ranked.length > 1;

  const activeIndex = useMemo(() => {
    if (ranked.length === 0) return 0;
    if (selectedPropertyId) {
      const idx = ranked.findIndex((l) => l.propertyId === selectedPropertyId);
      if (idx >= 0) return idx;
    }
    return 0;
  }, [ranked, selectedPropertyId]);

  const display = useMemo(() => {
    if (ranked.length === 0) return best;
    return ranked[activeIndex] ?? best;
  }, [ranked, activeIndex, best]);

  navRef.current = { canNavigate, activeIndex, ranked };

  const goToOffset = (offset: 1 | -1) => {
    const { canNavigate: ok, activeIndex: idx, ranked: list } = navRef.current;
    if (!ok || list.length === 0) return;
    const nextIndex = ((idx + offset) % list.length + list.length) % list.length;
    const target = list[nextIndex];
    if (!target?.propertyId) return;
    setNavDir(offset);
    onSelectListing?.(target.propertyId);
  };

  // Preload adjacent listing images so navigation never flashes white
  useEffect(() => {
    if (ranked.length < 2) return;
    const prev = ranked[(activeIndex - 1 + ranked.length) % ranked.length];
    const next = ranked[(activeIndex + 1) % ranked.length];
    preloadImage(prev?.imageUrl);
    preloadImage(next?.imageUrl);
    preloadImage(ranked[activeIndex]?.imageUrl);
  }, [ranked, activeIndex]);

  // Hold previous thumbnail under the new one for a soft crossfade
  useEffect(() => {
    const nextUrl = display?.imageUrl ?? null;
    const prevUrl = prevImageRef.current;
    if (prevUrl && nextUrl && prevUrl !== nextUrl && !reduceMotion) {
      setFadeImage(prevUrl);
      setIncomingOpaque(false);
      const raf = requestAnimationFrame(() => setIncomingOpaque(true));
      const t = window.setTimeout(() => setFadeImage(null), 220);
      prevImageRef.current = nextUrl;
      return () => {
        cancelAnimationFrame(raf);
        window.clearTimeout(t);
      };
    }
    prevImageRef.current = nextUrl;
    setFadeImage(null);
    setIncomingOpaque(true);
  }, [display?.imageUrl, display?.propertyId, reduceMotion]);

  // Keyboard ← / → when card is mounted
  useEffect(() => {
    if (!canNavigate || hidden || !areaId) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.target as HTMLElement | null)?.isContentEditable) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToOffset(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToOffset(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- goToOffset reads navRef
  }, [canNavigate, hidden, areaId, onSelectListing]);

  if (hidden || !areaId) return null;

  const animMs = reduceMotion ? 0 : 0.2;
  const anim = {
    duration: animMs,
    ease: [0.22, 1, 0.36, 1] as const,
  };

  const showProperty = Boolean(display);
  const showNearestOnly = !display && Boolean(nearest);
  const showExpanding =
    !showProperty && !showNearestOnly && diag.nodeListingCount === 0;

  const meta = display ? listingMeta(display) : null;
  const counterLabel = `${activeIndex + 1} of ${ranked.length}`;

  const onTouchStart = (e: TouchEvent) => {
    if (!canNavigate) return;
    touchStartX.current = e.changedTouches[0]?.clientX ?? null;
  };

  const onTouchEnd = (e: TouchEvent) => {
    if (!canNavigate || touchStartX.current == null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const dx = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 48) return;
    // Swipe left → next; swipe right → previous
    if (dx < 0) goToOffset(1);
    else goToOffset(-1);
  };

  return (
    <div
      className={`pointer-events-none absolute bottom-4 left-4 z-[20] w-[min(450px,calc(100%-2rem))] transition-[bottom] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] sm:bottom-6 sm:left-6 sm:w-[450px] ${className ?? ""}`}
      data-areaiq-best-card="true"
      data-chosen={display?.propertyId ?? nearest?.listing.propertyId ?? "none"}
    >
      <AnimatePresence mode="wait">
        {showProperty && display && meta ? (
          <motion.div
            key={`preview-${areaId}`}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{
              opacity: mapBusy ? 0.22 : 1,
              y: 0,
              scale: 1,
            }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={anim}
            className="pointer-events-auto"
          >
            <div
              className="group relative overflow-hidden rounded-[24px] border border-black/[0.04] bg-white/92 shadow-[0_8px_30px_rgba(15,23,42,0.08),0_2px_8px_rgba(15,23,42,0.04)] backdrop-blur-2xl transition-shadow duration-200 hover:shadow-[0_16px_40px_rgba(15,23,42,0.12)]"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              <button
                type="button"
                className="flex w-full items-stretch gap-0 p-3 text-left"
                onClick={() => {
                  if (display.propertyId) {
                    onSelectListing?.(display.propertyId);
                  }
                }}
              >
                {/* Left image */}
                <div className="relative h-[148px] w-[42%] shrink-0 overflow-hidden rounded-[18px] bg-[#F0F2F1] sm:h-[158px]">
                  {fadeImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={fadeImage}
                      alt=""
                      aria-hidden
                      className="absolute inset-0 h-full w-full object-cover"
                      decoding="async"
                    />
                  ) : null}
                  {display.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={display.imageUrl}
                      src={display.imageUrl}
                      alt=""
                      className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ease-out ${
                        incomingOpaque ? "opacity-100" : "opacity-0"
                      }`}
                      decoding="async"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[11px] font-medium text-neutral-400">
                      AreaIQ
                    </div>
                  )}
                </div>

                {/* Right meta */}
                <div className="relative min-w-0 flex-1 overflow-hidden pl-4 pr-1">
                  <AnimatePresence mode="wait" initial={false} custom={navDir}>
                    <motion.div
                      key={display.propertyId ?? display.id}
                      custom={navDir}
                      initial={
                        reduceMotion
                          ? { opacity: 1, x: 0 }
                          : { opacity: 0, x: navDir * 8 }
                      }
                      animate={{ opacity: 1, x: 0 }}
                      exit={
                        reduceMotion
                          ? { opacity: 0, x: 0 }
                          : { opacity: 0, x: navDir * -8 }
                      }
                      transition={anim}
                      className="flex h-full min-w-0 flex-col justify-between py-0.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold tracking-tight text-neutral-900">
                          {display.name}
                        </p>
                        <p className="mt-1.5 text-[1.4rem] font-semibold leading-none tracking-tight tabular-nums text-neutral-900">
                          {meta.price}
                        </p>
                        <p className="mt-1.5 truncate text-[12px] font-medium text-neutral-400">
                          {display.builderName || "Verified builder"}
                        </p>
                        {meta.specs ? (
                          <p className="mt-1 truncate text-[12px] font-normal text-neutral-500">
                            {meta.specs}
                          </p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {display.verified ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#326F1A]">
                              <ShieldCheck className="h-3 w-3" aria-hidden />
                              Verified
                            </span>
                          ) : null}
                          <span
                            className="inline-flex items-center gap-0.5 text-[12px] font-semibold tabular-nums"
                            style={{ color: meta.scoreColor }}
                          >
                            <Star
                              className="h-3 w-3 fill-current"
                              aria-hidden
                            />
                            {display.score ?? "—"}
                            <span className="ml-0.5 font-normal text-neutral-400">
                              AreaIQ
                            </span>
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <Link
                          href={display.href}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-neutral-800 no-underline transition-opacity duration-200 hover:opacity-60"
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden />
                          View Details
                        </Link>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </button>

              {canNavigate ? (
                <div className="flex items-center justify-between border-t border-black/[0.04] px-3 py-2">
                  <button
                    type="button"
                    onClick={() => goToOffset(-1)}
                    className="inline-flex h-9 items-center gap-1 rounded-[16px] px-3 text-[12px] font-medium text-neutral-600 transition-colors duration-200 hover:bg-black/[0.04] hover:text-neutral-900"
                    aria-label="Previous listing"
                  >
                    <ChevronLeft className="h-4 w-4" strokeWidth={2} />
                    Previous
                  </button>
                  <p
                    className="text-[12px] font-medium tabular-nums text-neutral-400"
                    aria-live="polite"
                  >
                    {activeIndex + 1} / {ranked.length}
                  </p>
                  <button
                    type="button"
                    onClick={() => goToOffset(1)}
                    className="inline-flex h-9 items-center gap-1 rounded-[16px] px-3 text-[12px] font-medium text-neutral-600 transition-colors duration-200 hover:bg-black/[0.04] hover:text-neutral-900"
                    aria-label="Next listing"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : showNearestOnly && nearest ? (
          <motion.div
            key={`nearest-${areaId}`}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: mapBusy ? 0.22 : 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={anim}
            className="pointer-events-auto"
          >
            <Link
              href={nearest.listing.href}
              className="flex overflow-hidden rounded-[24px] border border-black/[0.04] bg-white/92 p-3 no-underline shadow-[0_8px_30px_rgba(15,23,42,0.08)] backdrop-blur-2xl"
            >
              <div className="h-[120px] w-[42%] shrink-0 overflow-hidden rounded-[18px] bg-[#F0F2F1]">
                {nearest.listing.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={nearest.listing.imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1 pl-4 py-1">
                <p className="text-[10px] font-normal uppercase tracking-[0.14em] text-neutral-400">
                  Nearby
                </p>
                <p className="mt-1 truncate text-[15px] font-semibold text-neutral-900">
                  {nearest.listing.name}
                </p>
                <p className="mt-1.5 text-[1.25rem] font-semibold tabular-nums text-neutral-900">
                  {nearest.listing.price != null && nearest.listing.price > 0
                    ? formatInrAmount(nearest.listing.price)
                    : "—"}
                </p>
                <p className="mt-1 text-[12px] font-medium text-neutral-500">
                  {nearest.distanceLabel}
                </p>
              </div>
            </Link>
          </motion.div>
        ) : showExpanding ? (
          <motion.div
            key={`empty-${areaId}`}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: mapBusy ? 0.22 : 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={anim}
            className="pointer-events-auto rounded-[24px] border border-black/[0.04] bg-white/90 px-5 py-4 shadow-[0_8px_30px_rgba(15,23,42,0.08)] backdrop-blur-2xl"
          >
            <p className="text-[14px] font-semibold text-neutral-900">
              Expanding coverage here
            </p>
            <p className="mt-1 text-[12px] font-normal text-neutral-400">
              Nearby verified projects stay on the map.
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
