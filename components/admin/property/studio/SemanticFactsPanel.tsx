"use client";

import type { BrainFact } from "@/lib/admin/property/studio/types";
import ConfidenceField from "./ConfidenceField";

interface Props {
  facts: BrainFact[];
  /** Live overrides keyed by fact.key */
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

const CATEGORY_ORDER: BrainFact["category"][] = [
  "connectivity",
  "location",
  "investment",
  "compliance",
  "product",
  "pricing",
  "identity",
  "amenities",
  "contact",
  "media",
  "other",
];

const CATEGORY_TITLE: Record<BrainFact["category"], string> = {
  connectivity: "Connectivity & Roads",
  location: "Location Intelligence",
  investment: "Investment Signals",
  compliance: "Trust & Compliance",
  product: "Product",
  pricing: "Pricing",
  identity: "Identity",
  amenities: "Amenities",
  contact: "Contact",
  media: "Media",
  other: "Other",
};

export default function SemanticFactsPanel({ facts, values, onChange }: Props) {
  if (facts.length === 0) return null;

  const grouped = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: facts.filter((f) => f.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-bold text-heading-primary">Semantic extraction</h2>
        <p className="mt-1 text-xs text-muted">
          Marketing language decomposed into structured AreaIQ Brain facts. Edit freely.
        </p>
      </div>
      {grouped.map(({ cat, items }) => (
        <section key={cat}>
          <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">
            {CATEGORY_TITLE[cat]}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((fact) => (
              <ConfidenceField
                key={fact.key}
                label={fact.label}
                value={values[fact.key] ?? fact.value}
                confidence={fact.confidence}
                onChange={(v) => onChange(fact.key, v)}
                placeholder="—"
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
