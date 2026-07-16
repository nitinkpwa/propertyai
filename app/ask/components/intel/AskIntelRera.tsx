"use client";

interface AskIntelReraProps {
  onAction: (q: string) => void;
}

export function AskIntelRera({ onAction }: AskIntelReraProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-wider text-label">
        RERA verification
      </p>
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/40 p-4 shadow-sm">
        <p className="text-sm font-bold text-heading-primary">Legal diligence checklist</p>
        <ul className="mt-3 space-y-2 text-xs text-body">
          {[
            "Confirm RERA registration number on listing",
            "Match project name & promoter on state RERA portal",
            "Check occupancy certificate / completion status",
            "Review pending litigation disclosures",
            "Verify payment schedule vs construction-linked plan",
          ].map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
              {item}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => onAction("Legal check and RERA verification for this property")}
          className="mt-4 w-full rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white"
        >
          Run legal check with AI
        </button>
      </div>
    </div>
  );
}
