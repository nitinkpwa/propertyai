"use client";

import type { StudioImageRef } from "@/lib/admin/property/studio/types";

interface Props {
  images: StudioImageRef[];
  onChange: (images: StudioImageRef[]) => void;
}

export default function ImageSortableGrid({ images, onChange }: Props) {
  if (images.length === 0) return null;

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
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
          className="group relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 shadow-sm"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.url} alt={img.name} className="aspect-square w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent px-2 py-2">
            <span className="truncate text-[10px] font-medium text-white">{img.name}</span>
            <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
              <button
                type="button"
                aria-label="Move left"
                onClick={() => move(index, index - 1)}
                className="rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-neutral-800"
              >
                ←
              </button>
              <button
                type="button"
                aria-label="Move right"
                onClick={() => move(index, index + 1)}
                className="rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-neutral-800"
              >
                →
              </button>
              <button
                type="button"
                aria-label="Remove"
                onClick={() => onChange(images.filter((i) => i.id !== img.id))}
                className="rounded-md bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white"
              >
                ✕
              </button>
            </div>
          </div>
          {index === 0 ? (
            <span className="absolute left-2 top-2 rounded-md bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
              Cover
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
