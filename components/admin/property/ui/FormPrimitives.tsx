"use client";

import type { ReactNode } from "react";
import { ADMIN_FORM_STYLES } from "@/lib/admin/property/constants";

export function FieldLabel({ children }: { children: ReactNode }) {
  return <label className={ADMIN_FORM_STYLES.label}>{children}</label>;
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={ADMIN_FORM_STYLES.input}
    />
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={ADMIN_FORM_STYLES.textarea}
    />
  );
}

export function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string } | string>;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={ADMIN_FORM_STYLES.input}>
      {options.map((opt) => {
        const val = typeof opt === "string" ? opt : opt.value;
        const label = typeof opt === "string" ? opt : opt.label;
        return (
          <option key={val} value={val}>
            {label}
          </option>
        );
      })}
    </select>
  );
}

export function FieldGrid({ children, cols = 2 }: { children: ReactNode; cols?: 1 | 2 | 3 }) {
  const colClass = cols === 1 ? "grid-cols-1" : cols === 3 ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 sm:grid-cols-2";
  return <div className={`grid gap-4 ${colClass}`}>{children}</div>;
}

export function Field({ label, children, span = 1 }: { label: string; children: ReactNode; span?: 1 | 2 }) {
  return (
    <div className={span === 2 ? "sm:col-span-2" : undefined}>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  );
}

export function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h3 className={ADMIN_FORM_STYLES.sectionTitle}>{title}</h3>
      {description ? <p className={ADMIN_FORM_STYLES.sectionDesc}>{description}</p> : null}
    </div>
  );
}

export function ToggleChip({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
        selected
          ? "border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-200"
          : "border-neutral-200 bg-white text-body hover:border-emerald-300 hover:bg-emerald-50"
      }`}
    >
      {label}
    </button>
  );
}

export function FlagToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3 transition hover:border-emerald-200">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
      />
      <span className="text-sm font-medium text-heading-secondary">{label}</span>
    </label>
  );
}

/** Clean iOS-style switch for admin legal verification. */
export function IosSwitch({
  checked,
  onChange,
  disabled,
  id,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  id?: string;
  label?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-emerald-500" : "bg-neutral-300"
      }`}
    >
      <span
        className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-[1.35rem]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
