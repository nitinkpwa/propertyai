"use client";

import { useEffect, useState } from "react";
import type { StudioImageRef } from "@/lib/admin/property/studio/types";

interface Props {
  images: StudioImageRef[];
  onChange: (images: StudioImageRef[]) => void;
}

export default function ImageSortableGrid({ images, onChange }: Props) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = () => setMenuOpen(null);
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [menuOpen]);

  if (images.length === 0) return null;

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  const setCover = (id: string) => {
    const index = images.findIndex((i) => i.id === id);
    if (index <= 0) return;
    const next = [...images];
    const [item] = next.splice(index, 1);
    next.unshift(item);
    onChange(next);
    setMenuOpen(null);
  };

  return (
    <>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-heading-primary">
          {images.length} {images.length === 1 ? "Photo" : "Photos"}
        </p>
        <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Cover Photo</p>
      </div>
      <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {images.map((img, index) => (
          <li
            key={img.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", String(index));
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const from = Number(e.dataTransfer.getData("text/plain"));
              if (!Number.isNaN(from)) move(from, index);
            }}
            className={`group relative overflow-hidden rounded-xl border bg-neutral-50 shadow-sm ${
              index === 0 ? "border-emerald-300 ring-2 ring-emerald-400/60" : "border-neutral-200"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt={img.name} className="aspect-square w-full object-cover" />

            <div className="absolute left-1.5 top-1.5 flex items-center gap-1">
              <span className="cursor-grab rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] text-white active:cursor-grabbing" title="Drag to reorder">
                ⠿
              </span>
              {index === 0 ? (
                <span className="rounded-md bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                  ⭐ Cover
                </span>
              ) : null}
            </div>

            <div className="absolute right-1.5 top-1.5">
              <button
                type="button"
                aria-label="Photo options"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setMenuOpen((v) => (v === img.id ? null : img.id))}
                className="rounded-md bg-black/60 px-2 py-0.5 text-xs font-bold text-white hover:bg-black/80"
              >
                ···
              </button>
              {menuOpen === img.id ? (
                <div
                  className="absolute right-0 top-7 z-20 min-w-[140px] overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-lg"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {index !== 0 ? (
                    <button
                      type="button"
                      className="flex w-full px-3 py-2 text-left text-xs font-medium text-heading-secondary hover:bg-emerald-50"
                      onClick={() => setCover(img.id)}
                    >
                      ⭐ Set as Cover
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="flex w-full px-3 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50"
                    onClick={() => {
                      setMenuOpen(null);
                      onChange(images.filter((i) => i.id !== img.id));
                    }}
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </div>

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2">
              <span className="truncate text-[10px] font-medium text-white">{img.name}</span>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
