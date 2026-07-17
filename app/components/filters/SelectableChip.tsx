"use client";

import { cn } from "./utils";

interface SelectableChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  size?: "sm" | "md";
}

export default function SelectableChip({
  label,
  selected,
  onClick,
  size = "md",
}: SelectableChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border font-medium transition-all duration-200 active:scale-[0.97]",
        size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
        selected
          ? "border-emerald-200 bg-emerald-50 text-emerald-800 shadow-[0_1px_2px_rgba(74, 170, 39,0.12)]"
          : "border-neutral-200 bg-white text-body hover:border-neutral-300 hover:bg-neutral-50 hover:shadow-sm",
      )}
    >
      {label}
    </button>
  );
}
