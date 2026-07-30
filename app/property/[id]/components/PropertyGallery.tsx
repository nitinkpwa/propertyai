"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PropertyDetail } from "../data";
import { ExpandIcon } from "./shared";

const Lightbox = dynamic(() => import("@/components/ui/Lightbox"), { ssr: false });

interface PropertyGalleryProps {
  images: PropertyDetail["images"];
  propertyName: string;
}

function GalleryPlaceholder({
  label,
  size = "md",
}: {
  label: string;
  size?: "md" | "lg";
}) {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6">
        <span
          className={`opacity-90 ${size === "lg" ? "text-7xl sm:text-8xl" : "text-5xl sm:text-6xl"}`}
        >
          🏠
        </span>
        <span className="rounded-full bg-white/20 px-4 py-1.5 type-caption font-medium text-white backdrop-blur-md">
          {label}
        </span>
      </div>
    </>
  );
}

function GalleryImage({
  src,
  alt,
  sizes,
  priority = false,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      {!loaded ? (
        <div
          className="absolute inset-0 animate-pulse bg-neutral-200/80"
          aria-hidden
        />
      ) : null}
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={`object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        unoptimized={src.startsWith("blob:") || src.startsWith("data:")}
        draggable={false}
        onLoad={() => setLoaded(true)}
      />
    </>
  );
}

export default function PropertyGallery({ images, propertyName }: PropertyGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const syncFromScroll = useRef(true);

  const galleryImages =
    images.length > 0
      ? images
      : [
          {
            id: "1",
            label: "Exterior View",
            gradient: "from-emerald-600/80 via-emerald-500/60 to-teal-400/50",
            url: null,
          },
        ];

  const closeFullscreen = useCallback(() => setFullscreen(false), []);

  const lightboxImages = useMemo(
    () =>
      galleryImages.map((img) => ({
        id: img.id,
        src: img.url ?? null,
        alt: img.label,
        gradient: img.gradient,
      })),
    [galleryImages],
  );

  const onScrollerScroll = useCallback(() => {
    if (!syncFromScroll.current) return;
    const el = scrollerRef.current;
    if (!el || el.clientWidth <= 0) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    setActiveIndex(Math.max(0, Math.min(next, galleryImages.length - 1)));
  }, [galleryImages.length]);

  const goToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      const clamped = Math.max(0, Math.min(index, galleryImages.length - 1));
      setActiveIndex(clamped);
      const el = scrollerRef.current;
      if (!el) return;
      syncFromScroll.current = false;
      el.scrollTo({ left: clamped * el.clientWidth, behavior });
      window.setTimeout(() => {
        syncFromScroll.current = true;
      }, behavior === "smooth" ? 320 : 0);
    },
    [galleryImages.length],
  );

  // Keep scroller aligned if layout width changes (orientation / resize).
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onResize = () => {
      syncFromScroll.current = false;
      el.scrollTo({ left: activeIndex * el.clientWidth, behavior: "auto" });
      syncFromScroll.current = true;
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [activeIndex]);

  // Preload adjacent images for smoother swipe.
  useEffect(() => {
    const next = galleryImages[activeIndex + 1]?.url;
    const prev = galleryImages[activeIndex - 1]?.url;
    for (const url of [next, prev]) {
      if (!url || typeof window === "undefined") continue;
      const img = new window.Image();
      img.src = url;
    }
  }, [activeIndex, galleryImages]);

  return (
    <>
      <div className="space-y-3">
        <div className="relative overflow-hidden rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] sm:rounded-3xl">
          <div
            ref={scrollerRef}
            onScroll={onScrollerScroll}
            className="flex aspect-[16/10] snap-x snap-mandatory overflow-x-auto scroll-smooth carousel-x sm:aspect-[16/9]"
            style={{ scrollbarWidth: "none" }}
          >
            {galleryImages.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setFullscreen(true)}
                className={`relative h-full w-full shrink-0 snap-center bg-gradient-to-br ${img.gradient}`}
                aria-label={`Open fullscreen — ${img.label}`}
              >
                {img.url ? (
                  <>
                    <GalleryImage
                      src={img.url}
                      alt={img.label}
                      sizes="(max-width: 768px) 100vw, 900px"
                      priority={i === 0}
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3">
                      <span className="rounded-full bg-black/40 px-3 py-1 type-caption font-medium text-white backdrop-blur-md">
                        {img.label}
                      </span>
                    </div>
                  </>
                ) : (
                  <GalleryPlaceholder label={img.label} />
                )}
              </button>
            ))}
          </div>

          {galleryImages.length > 1 ? (
            <>
              <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                {activeIndex + 1}/{galleryImages.length}
              </span>
              <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                {galleryImages.map((img, i) => (
                  <span
                    key={img.id}
                    className={`h-1.5 rounded-full transition-all ${
                      i === activeIndex ? "w-4 bg-white" : "w-1.5 bg-white/50"
                    }`}
                    aria-hidden
                  />
                ))}
              </div>
            </>
          ) : null}

          <button
            type="button"
            onClick={() => setFullscreen(true)}
            className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 type-micro font-medium text-white backdrop-blur-md"
            aria-label="Open fullscreen gallery"
          >
            <ExpandIcon />
            <span className="hidden sm:inline">View fullscreen</span>
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 carousel-x scrollbar-thin">
          {galleryImages.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => goToIndex(i)}
              aria-label={`Show ${img.label}`}
              aria-pressed={i === activeIndex}
              className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br ${img.gradient} transition-all duration-200 sm:h-20 sm:w-28 sm:rounded-2xl ${
                i === activeIndex
                  ? "ring-2 ring-emerald-500 ring-offset-2"
                  : "opacity-70 hover:opacity-100"
              }`}
            >
              {img.url ? (
                <>
                  <GalleryImage src={img.url} alt={img.label} sizes="112px" />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent px-1.5 py-1 type-micro font-medium text-white">
                    {img.label}
                  </span>
                </>
              ) : (
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent px-1.5 py-1 type-micro font-medium text-white">
                  {img.label}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <Lightbox
        open={fullscreen}
        onClose={closeFullscreen}
        images={lightboxImages}
        index={activeIndex}
        onIndexChange={(i) => goToIndex(i, "auto")}
        title={propertyName}
      />
    </>
  );
}
