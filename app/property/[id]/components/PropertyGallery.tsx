"use client";

import { useCallback, useEffect, useState } from "react";
import type { PropertyDetail } from "../data";
import { CloseIcon, ExpandIcon } from "./shared";

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
        <span className="rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-md">
          {label}
        </span>
      </div>
    </>
  );
}

export default function PropertyGallery({ images, propertyName }: PropertyGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

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

  const active = galleryImages[activeIndex] ?? galleryImages[0];

  const closeFullscreen = useCallback(() => setFullscreen(false), []);

  useEffect(() => {
    if (!fullscreen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeFullscreen();
      if (e.key === "ArrowRight") setActiveIndex((i) => (i + 1) % galleryImages.length);
      if (e.key === "ArrowLeft") setActiveIndex((i) => (i - 1 + galleryImages.length) % galleryImages.length);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [fullscreen, galleryImages.length, closeFullscreen]);

  return (
    <>
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setFullscreen(true)}
          className={`group relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-gradient-to-br ${active.gradient} shadow-[0_4px_24px_rgba(0,0,0,0.08)] transition-shadow hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)] sm:aspect-[16/9] sm:rounded-3xl`}
          aria-label="Open fullscreen gallery"
        >
          {active.url ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={active.url}
                alt={active.label}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3">
                <span className="rounded-full bg-black/40 px-3 py-1 text-sm font-medium text-white backdrop-blur-md">
                  {active.label}
                </span>
              </div>
            </>
          ) : (
            <GalleryPlaceholder label={active.label} />
          )}
          <div className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md opacity-0 transition-opacity group-hover:opacity-100">
            <ExpandIcon />
            View fullscreen
          </div>
        </button>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {galleryImages.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActiveIndex(i)}
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.label}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent px-1.5 py-1 text-[9px] font-medium text-white sm:text-[10px]">
                    {img.label}
                  </span>
                </>
              ) : (
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent px-1.5 py-1 text-[9px] font-medium text-white sm:text-[10px]">
                  {img.label}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {fullscreen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={`${propertyName} photo gallery`}
        >
          <button
            type="button"
            onClick={closeFullscreen}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 sm:right-8 sm:top-8"
            aria-label="Close gallery"
          >
            <CloseIcon />
          </button>

          <button
            type="button"
            onClick={() => setActiveIndex((i) => (i - 1 + galleryImages.length) % galleryImages.length)}
            className="absolute left-2 z-10 hidden h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl text-white backdrop-blur-md transition-colors hover:bg-white/20 sm:flex sm:left-8"
            aria-label="Previous image"
          >
            ‹
          </button>

          <div
            className={`relative aspect-[16/10] w-full max-w-5xl overflow-hidden rounded-2xl bg-gradient-to-br ${active.gradient} sm:rounded-3xl`}
          >
            {active.url ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={active.url}
                  alt={active.label}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-6 py-5 text-center">
                  <p className="text-lg font-semibold text-white/90">{active.label}</p>
                  <p className="text-sm text-white/60">
                    {activeIndex + 1} / {galleryImages.length}
                  </p>
                </div>
              </>
            ) : (
              <>
                <GalleryPlaceholder label={active.label} size="lg" />
                <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-sm text-white/60">
                  {activeIndex + 1} / {galleryImages.length}
                </p>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setActiveIndex((i) => (i + 1) % galleryImages.length)}
            className="absolute right-2 z-10 hidden h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl text-white backdrop-blur-md transition-colors hover:bg-white/20 sm:flex sm:right-8"
            aria-label="Next image"
          >
            ›
          </button>

          <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2 sm:bottom-10">
            {galleryImages.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setActiveIndex(i)}
                aria-label={img.label}
                className={`h-2 rounded-full transition-all ${i === activeIndex ? "w-6 bg-emerald-400" : "w-2 bg-white/40 hover:bg-white/60"}`}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
