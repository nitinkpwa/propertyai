"use client";

interface TabItem {
  id: string;
  label: string;
  badge?: number | string;
}

interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

export default function Tabs({ items, value, onChange, className = "" }: TabsProps) {
  return (
    <div
      role="tablist"
      className={`flex gap-1 overflow-x-auto scroll-touch border-b border-neutral-200 ${className}`}
    >
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={`relative min-h-12 shrink-0 px-4 text-sm font-semibold transition-colors ${
              active ? "text-brand-dark" : "text-muted hover:text-heading-primary"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              {item.label}
              {item.badge !== undefined ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-neutral-100 px-1.5 text-xs font-bold text-body">
                  {item.badge}
                </span>
              ) : null}
            </span>
            {active ? (
              <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand" aria-hidden />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
