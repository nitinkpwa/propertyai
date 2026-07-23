"use client";

import { useEffect, useMemo, useState } from "react";
import { createBroadcastNotification } from "@/lib/notifications/broadcasts";
import {
  addStoredBroadcast,
  getStoredBroadcasts,
  removeStoredBroadcast,
} from "@/lib/notifications/storage";
import type {
  AdminBroadcastInput,
  IntelligenceNotification,
} from "@/lib/notifications/types";
import { Button } from "@/components/ui/Button";
import Card from "@/components/ui/Card";

type LocalCategory = AdminBroadcastInput["category"];

const CATEGORIES: { value: LocalCategory; label: string }[] = [
  { value: "maintenance", label: "Maintenance" },
  { value: "feature", label: "Feature launch" },
  { value: "holiday", label: "Holiday" },
  { value: "market_report", label: "Market report" },
  { value: "builder_update", label: "Builder update" },
  { value: "general", label: "General" },
];

/**
 * Admin broadcast composer.
 * Local drafts stored in localStorage until site_announcements migration is applied.
 * Hydration-safe: storage loaded after mount.
 */
export default function AdminBroadcastPanel() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [href, setHref] = useState("");
  const [category, setCategory] = useState<LocalCategory>("feature");
  const [audience, setAudience] =
    useState<AdminBroadcastInput["audience"]>("all");
  const [items, setItems] = useState<IntelligenceNotification[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setItems(getStoredBroadcasts() as IntelligenceNotification[]);
  }, []);

  const unique = useMemo(() => {
    const map = new Map<string, IntelligenceNotification>();
    for (const i of items) map.set(i.id, i);
    return [...map.values()];
  }, [items]);

  const handlePublish = () => {
    if (!title.trim()) return;
    const item = createBroadcastNotification({
      title: title.trim(),
      message: message.trim() || undefined,
      href: href.trim() || undefined,
      category,
      audience,
    });
    addStoredBroadcast(item as never);
    setItems(getStoredBroadcasts() as IntelligenceNotification[]);
    setTitle("");
    setMessage("");
    setHref("");
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  const handleRemove = (id: string) => {
    removeStoredBroadcast(id);
    setItems(getStoredBroadcasts() as IntelligenceNotification[]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-heading-primary">Broadcasts</h2>
        <p className="mt-1 text-sm text-muted">
          Publish real announcements to the Smart Intelligence Bar. Prefer writing to{" "}
          <code className="text-xs">site_announcements</code> after migration. Local drafts
          are device-only and never invent market statistics.
        </p>
      </div>

      <Card padding="lg" className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-label">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Scheduled maintenance tonight 11 PM–1 AM"
            className="h-12 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm outline-none focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/10"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-label">Message (optional)</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            placeholder="Short supporting detail"
            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/10"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-label">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as LocalCategory)}
              className="h-12 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-label">Audience</label>
            <select
              value={audience}
              onChange={(e) =>
                setAudience(e.target.value as AdminBroadcastInput["audience"])
              }
              className="h-12 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm"
            >
              <option value="all">Everyone</option>
              <option value="public">Logged out only</option>
              <option value="authenticated">Logged in</option>
              <option value="buyer">Buyers</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-label">Link (optional)</label>
            <input
              value={href}
              onChange={(e) => setHref(e.target.value)}
              placeholder="/ask"
              className="h-12 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm outline-none focus:border-brand focus:bg-white"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handlePublish} disabled={!title.trim()}>
            Save draft broadcast
          </Button>
          {saved ? (
            <span className="text-sm font-medium text-emerald-700">Saved ✓</span>
          ) : null}
        </div>
      </Card>

      <Card padding="md">
        <p className="mb-3 text-sm font-semibold text-heading-primary">
          Local drafts ({unique.length})
        </p>
        {unique.length === 0 ? (
          <p className="text-sm text-muted">No drafts yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {unique.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-heading-primary">
                    <span className="mr-1.5" aria-hidden>
                      {item.icon}
                    </span>
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">{item.reason}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
                  className="shrink-0 text-xs font-semibold text-rose-600 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

