"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";

interface GalleryImage {
  src: string;
  alt?: string;
}

interface GalleryProps {
  images: GalleryImage[];
  aspect?: "16/9" | "4/3" | "1/1";
  className?: string;
  onOpenFullscreen?: (index: number) => void;
}

const ASPECT = {
  "16/9": "aspect-video",
  "4/3": "aspect-[4/3]",
  "1/1": "aspect-square",
} as const;

export default function Gallery({
  images,
  aspect = "16/9",
  className = "",
  onOpenFullscreen,
}: GalleryProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const list = images.length > 0 ? images : [{ src: "", alt: "No image" }];

  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    setIndex(Math.max(0, Math.min(i, list.length - 1)));
  }, [list.length]);

  return (
    <div className={`relative overflow-hidden bg-neutral-100 ${className}`}>
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className={`flex snap-x snap-mandatory overflow-x-auto scroll-touch ${ASPECT[aspect]}`}
        style={{ scrollbarWidth: "none" }}
      >
        {list.map((img, i) => (
          <button
            key={`${img.src}-${i}`}
            type="button"
            className="relative h-full w-full shrink-0 snap-center"
            onClick={() => onOpenFullscreen?.(i)}
            aria-label={img.alt ?? `Image ${i + 1}`}
          >
            {img.src ? (
              <Image
                src={img.src}
                alt={img.alt ?? `Photo ${i + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, 800px"
                className="object-cover animate-image-fade"
                priority={i === 0}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-muted">
                No photo
              </div>
            )}
          </button>
        ))}
      </div>

      {list.length > 1 ? (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
          {list.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-4 bg-white" : "w-1.5 bg-white/50"
              }`}
              aria-hidden
            />
          ))}
        </div>
      ) : null}

      {list.length > 1 ? (
        <span className="absolute right-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
          {index + 1}/{list.length}
        </span>
      ) : null}
    </div>
  );
}
