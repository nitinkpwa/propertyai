"use client";

import Link from "next/link";

const ACTIONS = [
  { href: "/properties", icon: "🔍", label: "Search", desc: "Find properties" },
  { href: "/ask", icon: "🤖", label: "Ask AI", desc: "Get insights" },
  { href: "/buyer/saved", icon: "❤️", label: "Saved", desc: "Your shortlist" },
  { href: "/buyer/compare", icon: "⚖️", label: "Compare", desc: "Side by side" },
  { href: "/buyer/site-visits", icon: "📅", label: "Visits", desc: "Book & track" },
  { href: "/buyer/crm", icon: "📊", label: "CRM", desc: "Your journey" },
];

export default function QuickActions() {
  return (
    <section aria-label="Quick actions">
      <h2 className="mb-4 text-lg font-bold text-neutral-900">Quick Actions</h2>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group flex flex-col items-center rounded-2xl border border-neutral-200/80 bg-white p-3 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md sm:p-4"
          >
            <span className="text-xl transition group-hover:scale-110 sm:text-2xl">{action.icon}</span>
            <span className="mt-2 text-xs font-semibold text-neutral-900 sm:text-sm">{action.label}</span>
            <span className="mt-0.5 hidden text-[10px] text-neutral-400 sm:block">{action.desc}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
