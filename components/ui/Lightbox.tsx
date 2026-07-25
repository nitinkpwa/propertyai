"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { OverlayPortal } from "@/components/layout/engine";
import { useOverlay } from "@/lib/layout/overlay";

export type LightboxImage = {
  id: string;
  src: string | null;
  alt: string;
  gradient?: string;
};

interface LightboxProps {
  open: boolean;
  onClose: () => void;
  images: LightboxImage[];
  index: number;
  onIndexChange: (index: number) => void;
  title?: string;
}

/**
 * Shared fullscreen gallery — swipe, prev/next, pinch + double-tap zoom,
 * safe-area aware, landscape optimized.
 */
export default function Lightbox({
  open,
  onClose,
  images,
  index,
  onIndexChange,
  title,
}: LightboxProps) {
  const { zClassName } = useOverlay("lightbox", open, onClose);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const pinchStart = useRef<number | null>(null);
  const lastTap = useRef(0);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  const count = images.length;
  const active = images[index] ?? images[0];

  const resetZoom = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const go = useCallback(
    (dir: -1 | 1) => {
      if (count <= 1) return;
      resetZoom();
      onIndexChange((index + dir + count) % count);
    },
    [count, index, onIndexChange, resetZoom],
  );

  useEffect(() => {
    if (!open) {
      resetZoom();
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, go, resetZoom]);

  const onTouchStart = (e: ReactTouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStart.current = Math.hypot(dx, dy) / scale;
      return;
    }
    swipeStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    const now = Date.now();
    if (now - lastTap.current < 280) {
      if (scale > 1) resetZoom();
      else setScale(2.25);
    }
    lastTap.current = now;
  };

  const onTouchMove = (e: ReactTouchEvent) => {
    if (e.touches.length === 2 && pinchStart.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      setScale(Math.min(4, Math.max(1, dist / pinchStart.current)));
    }
  };

  const onTouchEnd = (e: ReactTouchEvent) => {
    if (pinchStart.current) {
      pinchStart.current = null;
      if (scale < 1.05) resetZoom();
      return;
    }
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start || scale > 1.05) return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      go(dx < 0 ? 1 : -1);
    }
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    if (scale <= 1) return;
    const startX = e.clientX - offset.x;
    const startY = e.clientY - offset.y;
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      setOffset({ x: ev.clientX - startX, y: ev.clientY - startY });
    };
    const up = () => {
      target.releasePointerCapture(e.pointerId);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  if (!open || !active) return null;

  const gradient = active.gradient ?? "from-neutral-800 to-neutral-900";

  return (
    <OverlayPortal>
      <div
        className={`fixed inset-0 ${zClassName} flex flex-col bg-black/92 backdrop-blur-sm`}
        role="dialog"
        aria-modal="true"
        aria-label={title ? `${title} photo gallery` : "Photo gallery"}
        style={{
          paddingTop: "var(--safe-top)",
          paddingBottom: "var(--safe-bottom)",
          paddingLeft: "var(--safe-left)",
          paddingRight: "var(--safe-right)",
        }}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 px-3 py-2 sm:px-6">
          <p className="min-w-0 truncate type-caption font-medium text-white/80">
            {active.alt}
            {count > 1 ? (
              <span className="ml-2 text-white/50">
                {index + 1}/{count}
              </span>
            ) : null}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="touch-target inline-flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Close gallery"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div
          className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 landscape:px-16"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {count > 1 ? (
            <button
              type="button"
              onClick={() => go(-1)}
              className="touch-target absolute left-2 z-10 inline-flex items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20"
              aria-label="Previous image"
            >
              ‹
            </button>
          ) : null}

          <div
            className={`relative aspect-[16/10] w-full max-w-5xl max-h-[min(80dvh,100%)] overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} landscape:max-h-[min(88dvh,100%)]`}
            onPointerDown={onPointerDown}
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transition: scale === 1 ? "transform 160ms ease" : undefined,
              touchAction: "none",
            }}
          >
            {active.src ? (
              <Image
                src={active.src}
                alt={active.alt}
                fill
                sizes="100vw"
                className="object-contain"
                priority
                unoptimized={active.src.startsWith("blob:") || active.src.startsWith("data:")}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-5xl text-white/80">
                🏠
              </div>
            )}
          </div>

          {count > 1 ? (
            <button
              type="button"
              onClick={() => go(1)}
              className="touch-target absolute right-2 z-10 inline-flex items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20"
              aria-label="Next image"
            >
              ›
            </button>
          ) : null}
        </div>

        {count > 1 ? (
          <div className="flex shrink-0 justify-center gap-1.5 px-4 py-3">
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                aria-label={`Show ${img.alt}`}
                aria-current={i === index}
                onClick={() => {
                  resetZoom();
                  onIndexChange(i);
                }}
                className={`h-2 w-2 rounded-full transition ${
                  i === index ? "bg-white" : "bg-white/35"
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </OverlayPortal>
  );
}
