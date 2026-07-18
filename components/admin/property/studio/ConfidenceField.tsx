"use client";

interface Props {
  label: string;
  value: string;
  confidence?: number;
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
}

function tone(confidence?: number) {
  if (confidence == null || confidence <= 0) {
    return "bg-neutral-100 text-muted";
  }
  if (confidence >= 90) return "bg-emerald-100 text-emerald-700";
  if (confidence >= 70) return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-700";
}

export default function ConfidenceField({
  label,
  value,
  confidence,
  onChange,
  multiline,
  placeholder,
}: Props) {
  const showConf = confidence != null && confidence > 0;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</label>
        {showConf ? (
          <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${tone(confidence)}`}>
            {Math.round(confidence!)}%
          </span>
        ) : null}
      </div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder={placeholder}
          className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-input outline-none ring-emerald-500/25 placeholder:text-placeholder focus:ring-2"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-input outline-none ring-emerald-500/25 placeholder:text-placeholder focus:ring-2"
        />
      )}
    </div>
  );
}
