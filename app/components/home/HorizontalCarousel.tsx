"use client";

import { useRef } from "react";

interface HorizontalCarouselProps {
  children: React.ReactNode;
  className?: string;
}

export default function HorizontalCarousel({
  children,
  className = "",
}: HorizontalCarouselProps) {
  const ref = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    ref.current?.scrollBy({
      left: dir === "left" ? -360 : 360,
      behavior: "smooth",
    });
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => scroll("left")}
        aria-label="Scroll left"
        className="absolute -left-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200/80 bg-white/90 text-body shadow-lg backdrop-blur-md transition-all hover:scale-105 hover:border-emerald-200 hover:text-emerald-600 md:flex"
      >
        ←
      </button>
      <button
        type="button"
        onClick={() => scroll("right")}
        aria-label="Scroll right"
        className="absolute -right-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200/80 bg-white/90 text-body shadow-lg backdrop-blur-md transition-all hover:scale-105 hover:border-emerald-200 hover:text-emerald-600 md:flex"
      >
        →
      </button>
      <div
        ref={ref}
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 scrollbar-hide [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </div>
  );
}
