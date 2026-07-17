"use client";

import type { AccountType } from "@/lib/auth/mobile";

const OPTIONS: { value: AccountType; label: string; description: string }[] = [
  { value: "buyer", label: "Buyer", description: "Search & invest" },
  { value: "seller", label: "Seller", description: "List properties" },
];

interface AccountTypeSelectorProps {
  value: AccountType;
  onChange: (value: AccountType) => void;
  error?: string | null;
}

export default function AccountTypeSelector({
  value,
  onChange,
  error,
}: AccountTypeSelectorProps) {
  return (
    <div className="mb-4">
      <p className="mb-2 block text-sm font-medium text-label">Account Type</p>
      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={selected}
              className={`rounded-xl border px-2 py-3 text-center transition-all duration-200 active:scale-[0.98] ${
                selected
                  ? "border-emerald-400 bg-emerald-50 shadow-[0_0_0_3px_rgba(74, 170, 39,0.12)]"
                  : "border-neutral-200 bg-neutral-50 hover:border-neutral-300 hover:bg-white"
              }`}
            >
              <span
                className={`block text-sm font-semibold ${
                  selected ? "text-emerald-700" : "text-heading-secondary"
                }`}
              >
                {option.label}
              </span>
              <span className="mt-0.5 block text-[10px] leading-tight text-muted">
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
      {error ? <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}
