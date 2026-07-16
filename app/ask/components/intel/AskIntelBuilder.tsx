"use client";

interface AskIntelBuilderProps {
  builderName: string | null;
  summary?: string;
  onAction: (q: string) => void;
}

export function AskIntelBuilder({ builderName, summary, onAction }: AskIntelBuilderProps) {
  const name = builderName?.trim() || "Builder";
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const metrics = [
    { label: "Builder Rating", value: "Review live" },
    { label: "Projects Delivered", value: "Ask AI" },
    { label: "Construction Quality", value: "Verify on site" },
    { label: "Delivery History", value: "Check RERA" },
    { label: "Legal Score", value: "RERA diligence" },
    { label: "Customer Rating", value: "Public reviews" },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-wider text-label">Builder profile</p>
      <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-900 text-sm font-bold text-white">
            {initials || "B"}
          </div>
          <div>
            <p className="font-bold text-heading-primary">{name}</p>
            <p className="text-xs text-muted">Builder intelligence · Tricity footprint</p>
          </div>
        </div>
        {summary ? (
          <p className="mt-3 line-clamp-4 text-xs leading-relaxed text-body">{summary}</p>
        ) : (
          <p className="mt-3 text-xs text-muted">
            Ask about delivery record, legal issues, or ongoing projects for a deeper dossier.
          </p>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-xl bg-neutral-50 px-2.5 py-2">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-label">{m.label}</p>
              <p className="mt-0.5 text-xs font-semibold text-heading-primary">{m.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[
            `Is ${name} a good builder?`,
            `${name} delivery record`,
            `${name} RERA projects`,
          ].map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onAction(q)}
              className="rounded-full border border-neutral-200 px-2.5 py-1 text-[10px] font-semibold text-body hover:border-emerald-300 hover:bg-emerald-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
