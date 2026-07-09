"use client";

interface ConnectEmptyModuleProps {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  tips?: string[];
}

export default function ConnectEmptyModule({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  tips,
}: ConnectEmptyModuleProps) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-200 bg-white px-6 py-16 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-50 text-3xl">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">{description}</p>
      {tips && tips.length > 0 ? (
        <ul className="mx-auto mt-4 max-w-sm space-y-1 text-left text-xs text-neutral-600">
          {tips.map((tip) => (
            <li key={tip}>✓ {tip}</li>
          ))}
        </ul>
      ) : null}
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-6 inline-flex rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-600 hover:shadow-md"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
