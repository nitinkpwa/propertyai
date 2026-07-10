"use client";

interface StepProgressProps {
  steps: Array<{ label: string; done: boolean; active?: boolean }>;
}

export default function StepProgress({ steps }: StepProgressProps) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => (
        <div key={step.label} className="flex flex-1 items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                step.done
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                  : step.active
                    ? "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400"
                    : "bg-neutral-100 text-muted"
              }`}
            >
              {step.done ? "✓" : i + 1}
            </div>
            <span
              className={`max-w-[4.5rem] text-center text-[10px] font-medium leading-tight ${
                step.done || step.active ? "text-heading-secondary" : "text-muted"
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 ? (
            <div
              className={`mx-1 mb-5 h-0.5 flex-1 ${step.done ? "bg-emerald-400" : "bg-neutral-200"}`}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}
