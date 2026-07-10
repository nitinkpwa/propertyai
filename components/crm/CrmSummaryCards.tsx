"use client";

import Link from "next/link";

interface CrmSummaryCardsProps {
  enquiriesCount: number;
  savedCount: number;
  chatsCount: number;
  visitsCount: number;
}

export default function CrmSummaryCards({
  enquiriesCount,
  savedCount,
  chatsCount,
  visitsCount,
}: CrmSummaryCardsProps) {
  const cards = [
    { label: "My Enquiries", value: enquiriesCount, href: "/buyer/crm#enquiries", icon: "📩" },
    { label: "Saved Properties", value: savedCount, href: "/buyer/saved", icon: "❤️" },
    { label: "AI Chats", value: chatsCount, href: "/ask", icon: "💬" },
    { label: "Site Visits", value: visitsCount, href: "/buyer/site-visits", icon: "📅" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      {cards.map((card) => (
        <Link
          key={card.label}
          href={card.href}
          className="group rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <span className="text-lg" aria-hidden>
            {card.icon}
          </span>
          <p className="mt-2 text-2xl font-bold text-heading-primary">{card.value}</p>
          <p className="mt-0.5 text-xs font-medium text-label group-hover:text-emerald-600">
            {card.label}
          </p>
        </Link>
      ))}
    </div>
  );
}
