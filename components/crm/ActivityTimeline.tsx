"use client";

import { ACTIVITY_ICONS } from "@/lib/crm/constants";
import type { CrmLeadActivity } from "@/lib/crm/types";

interface ActivityTimelineProps {
  activities: CrmLeadActivity[];
  emptyMessage?: string;
  maxItems?: number;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  if (sameDay) {
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }

  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ActivityTimeline({
  activities,
  emptyMessage = "No activity yet. Your journey will appear here.",
  maxItems,
}: ActivityTimelineProps) {
  const items = maxItems ? activities.slice(-maxItems) : activities;

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50 px-6 py-10 text-center">
        <p className="text-sm text-neutral-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ol className="relative space-y-0">
      {items.map((activity, idx) => {
        const icon = ACTIVITY_ICONS[activity.activity_type] ?? "•";
        const isLast = idx === items.length - 1;

        return (
          <li key={activity.id} className="relative flex gap-4 pb-6">
            {!isLast ? (
              <span
                className="absolute left-[15px] top-8 h-[calc(100%-8px)] w-px bg-neutral-200"
                aria-hidden
              />
            ) : null}
            <span
              className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm shadow-sm ring-1 ring-neutral-200"
              aria-hidden
            >
              {icon}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-neutral-900">{activity.title}</p>
                <time className="text-xs text-neutral-400" dateTime={activity.created_at}>
                  {formatWhen(activity.created_at)}
                </time>
              </div>
              {activity.description ? (
                <p className="mt-1 text-sm text-neutral-600">{activity.description}</p>
              ) : null}
              {activity.property?.title ? (
                <p className="mt-1 text-xs text-emerald-600">
                  {activity.property.title}
                  {activity.property.city ? ` · ${activity.property.city}` : ""}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
