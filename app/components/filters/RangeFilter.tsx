"use client";

import {
  AREA_MAX,
  AREA_MIN,
  AREA_STEP,
  BUDGET_MAX,
  BUDGET_MIN,
  BUDGET_STEP,
} from "@/lib/properties/constants";
import { formatIndianPrice } from "./utils";

interface RangeFilterProps {
  label: string;
  min: number | null;
  max: number | null;
  floor: number;
  ceiling: number;
  step: number;
  unit?: string;
  formatValue?: (value: number) => string;
  onChange: (min: number | null, max: number | null) => void;
}

export default function RangeFilter({
  label,
  min,
  max,
  floor,
  ceiling,
  step,
  unit,
  formatValue = (value) => String(value),
  onChange,
}: RangeFilterProps) {
  const displayMin = min ?? floor;
  const displayMax = max ?? ceiling;

  const handleMinSlider = (value: number) => {
    const upperBound = max ?? ceiling;
    const nextMin = Math.min(value, upperBound);
    onChange(nextMin, max);
  };

  const handleMaxSlider = (value: number) => {
    const lowerBound = min ?? floor;
    const nextMax = Math.max(value, lowerBound);
    onChange(min, nextMax);
  };

  const handleMinInput = (raw: string) => {
    if (!raw) {
      onChange(null, max);
      return;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    onChange(parsed, max);
  };

  const handleMaxInput = (raw: string) => {
    if (!raw) {
      onChange(min, null);
      return;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    onChange(min, parsed);
  };

  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
        {label}
      </p>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-[11px] font-medium text-neutral-500">
            Min {unit ?? ""}
          </label>
          <input
            type="number"
            value={min ?? ""}
            placeholder={formatValue(floor)}
            onChange={(event) => handleMinInput(event.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none transition-all focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-medium text-neutral-500">
            Max {unit ?? ""}
          </label>
          <input
            type="number"
            value={max ?? ""}
            placeholder={formatValue(ceiling)}
            onChange={(event) => handleMaxInput(event.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none transition-all focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
      </div>

      <div className="space-y-3">
        <input
          type="range"
          min={floor}
          max={ceiling}
          step={step}
          value={displayMin}
          onChange={(event) => handleMinSlider(Number(event.target.value))}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-neutral-200 accent-[#22C55E]"
        />
        <input
          type="range"
          min={floor}
          max={ceiling}
          step={step}
          value={displayMax}
          onChange={(event) => handleMaxSlider(Number(event.target.value))}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-neutral-200 accent-[#22C55E]"
        />
      </div>

      <p className="mt-3 text-xs font-medium text-neutral-500">
        {formatValue(displayMin)} – {formatValue(displayMax)}
      </p>
    </div>
  );
}

export function BudgetFilter({
  minPrice,
  maxPrice,
  onChange,
}: {
  minPrice: number | null;
  maxPrice: number | null;
  onChange: (min: number | null, max: number | null) => void;
}) {
  return (
    <RangeFilter
      label="Budget"
      min={minPrice}
      max={maxPrice}
      floor={BUDGET_MIN}
      ceiling={BUDGET_MAX}
      step={BUDGET_STEP}
      formatValue={formatIndianPrice}
      onChange={onChange}
    />
  );
}

export function AreaFilter({
  minArea,
  maxArea,
  onChange,
}: {
  minArea: number | null;
  maxArea: number | null;
  onChange: (min: number | null, max: number | null) => void;
}) {
  return (
    <RangeFilter
      label="Area"
      min={minArea}
      max={maxArea}
      floor={AREA_MIN}
      ceiling={AREA_MAX}
      step={AREA_STEP}
      unit="Sq Ft"
      formatValue={(value) => `${value.toLocaleString("en-IN")} sq ft`}
      onChange={onChange}
    />
  );
}
