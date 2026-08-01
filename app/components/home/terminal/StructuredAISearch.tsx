"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  BedDouble,
  Building2,
  MapPin,
  Search,
  Target,
  Wallet,
} from "lucide-react";
import { IQ_GREEN } from "../theme";
import { TerminalSectionHeader } from "./primitives";
import { useTerminalData } from "./useTerminalData";

type FieldKey = "where" | "budget" | "bedrooms" | "type" | "goal";

const FIELDS: {
  key: FieldKey;
  label: string;
  icon: typeof MapPin;
  optionsKey: "locations" | "budgets" | "bedrooms" | "propertyTypes" | "goals";
}[] = [
  { key: "where", label: "Where?", icon: MapPin, optionsKey: "locations" },
  { key: "budget", label: "Budget?", icon: Wallet, optionsKey: "budgets" },
  { key: "bedrooms", label: "Bedrooms?", icon: BedDouble, optionsKey: "bedrooms" },
  { key: "type", label: "Type?", icon: Building2, optionsKey: "propertyTypes" },
  { key: "goal", label: "Goal?", icon: Target, optionsKey: "goals" },
];

export default function StructuredAISearch() {
  const router = useRouter();
  const { bundle } = useTerminalData();
  const defaults = bundle?.searchDefaults;
  const [active, setActive] = useState<FieldKey | null>("where");
  const [values, setValues] = useState<Record<FieldKey, string>>({
    where: "",
    budget: "",
    bedrooms: "",
    type: "",
    goal: "",
  });

  const activeField = FIELDS.find((f) => f.key === active) ?? FIELDS[0];
  const options = useMemo(() => {
    if (!defaults || !activeField) return [];
    return defaults[activeField.optionsKey] ?? [];
  }, [defaults, activeField]);

  const search = () => {
    const parts: string[] = [];
    if (values.goal) parts.push(values.goal);
    if (values.type) parts.push(values.type);
    if (values.bedrooms) parts.push(`${values.bedrooms} BHK`);
    if (values.where) parts.push(`in ${values.where}`);
    if (values.budget) {
      const [min, max] = values.budget.split("-");
      if (min && max) parts.push(`budget ${min} to ${max}`);
      else if (min) parts.push(`budget above ${min}`);
    }

    const q = parts.join(" ").trim();
    if (!q) {
      router.push("/ask");
      return;
    }

    // Prefer properties browse when structured filters are clear
    if (values.where || values.budget || values.bedrooms || values.type) {
      const params = new URLSearchParams();
      if (values.where) params.set("location", values.where);
      if (values.type) params.set("type", values.type);
      if (values.bedrooms) params.set("bhk", values.bedrooms);
      if (values.budget) {
        const [min, max] = values.budget.split("-");
        if (min) params.set("min", min);
        if (max) params.set("max", max);
      }
      if (values.goal) {
        router.push(`/ask?q=${encodeURIComponent(q)}`);
        return;
      }
      router.push(`/properties?${params.toString()}`);
      return;
    }

    router.push(`/ask?q=${encodeURIComponent(q)}`);
  };

  return (
    <section className="bg-white py-14 sm:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <TerminalSectionHeader
          eyebrow="Search"
          title="Find with intent"
          action={{ label: "Ask freely", href: "/ask" }}
        />

        <div className="overflow-hidden rounded-3xl border border-neutral-200/80 bg-[#F7F9FB] shadow-[0_12px_40px_rgba(0,0,0,0.04)]">
          <div className="grid divide-y divide-neutral-200/80 sm:grid-cols-5 sm:divide-x sm:divide-y-0">
            {FIELDS.map((field) => {
              const Icon = field.icon;
              const selected = active === field.key;
              const valueLabel =
                defaults?.[field.optionsKey]?.find((o) => o.value === values[field.key])
                  ?.label ?? "";
              return (
                <button
                  key={field.key}
                  type="button"
                  onClick={() => setActive(field.key)}
                  className={`flex flex-col items-start gap-1 px-4 py-4 text-left transition-colors ${
                    selected ? "bg-white" : "hover:bg-white/70"
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                    <Icon className="h-3.5 w-3.5" style={{ color: IQ_GREEN }} aria-hidden />
                    {field.label}
                  </span>
                  <span className="truncate text-sm font-semibold text-heading-primary">
                    {valueLabel || "Any"}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="border-t border-neutral-200/80 bg-white px-4 py-4">
            <div className="flex flex-wrap gap-2">
              {options.map((opt) => {
                const on = values[activeField.key] === opt.value;
                return (
                  <motion.button
                    key={opt.id}
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() =>
                      setValues((v) => ({
                        ...v,
                        [activeField.key]: on ? "" : opt.value,
                      }))
                    }
                    className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                      on
                        ? "text-white"
                        : "border border-neutral-200 bg-[#F7F9FB] text-body hover:border-emerald-200"
                    }`}
                    style={on ? { backgroundColor: IQ_GREEN } : undefined}
                  >
                    {opt.label}
                  </motion.button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={search}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold text-white sm:w-auto sm:px-10"
              style={{ backgroundColor: IQ_GREEN }}
            >
              <Search className="h-4 w-4" aria-hidden />
              Search AreaIQ
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
