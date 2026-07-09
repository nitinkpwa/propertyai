import type { ConnectPartnerActivity } from "@/lib/connect/partners/types";

function formatActivityTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const TYPE_ICONS: Record<string, string> = {
  partner_created: "🏢",
  buyer_assigned: "👤",
  buyer_removed: "👤",
  property_assigned: "🏠",
  property_updated: "🏠",
  property_approved: "✅",
  property_rejected: "❌",
  site_visit: "📅",
  login: "🔑",
  logout: "🚪",
  notes_added: "📝",
  lead_updated: "📊",
};

interface ConnectPartnerActivityTimelineProps {
  activities: ConnectPartnerActivity[];
  maxItems?: number;
}

export default function ConnectPartnerActivityTimeline({
  activities,
  maxItems = 20,
}: ConnectPartnerActivityTimelineProps) {
  const items = activities.slice(0, maxItems);

  if (items.length === 0) {
    return <p className="text-sm text-neutral-500">No activities recorded yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((activity) => (
        <li
          key={activity.id}
          className="flex gap-3 rounded-xl border border-neutral-100 bg-neutral-50/80 px-4 py-3"
        >
          <span className="text-lg" aria-hidden>
            {TYPE_ICONS[activity.type] ?? "•"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-neutral-900">{activity.description}</p>
            <p className="mt-1 text-xs text-neutral-500">
              {formatActivityTime(activity.created_at)}
              {activity.actor?.full_name ? ` · ${activity.actor.full_name}` : ""}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
