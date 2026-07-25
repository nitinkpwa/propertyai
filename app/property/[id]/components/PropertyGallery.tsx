"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
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
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className="object-cover"
      unoptimized={src.startsWith("blob:") || src.startsWith("data:")}
    />
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
              <GalleryImage
                src={active.url}
                alt={active.label}
                sizes="(max-width: 768px) 100vw, 900px"
                priority
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3">
                <span className="rounded-full bg-black/40 px-3 py-1 type-caption font-medium text-white backdrop-blur-md">
                  {active.label}
                </span>
              </div>
            </>
          ) : (
            <GalleryPlaceholder label={active.label} />
          )}
          <div className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 type-micro font-medium text-white backdrop-blur-md opacity-0 transition-opacity group-hover:opacity-100">
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
        onIndexChange={setActiveIndex}
        title={propertyName}
      />
    </>
  );
}
