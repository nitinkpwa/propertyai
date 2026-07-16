"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  groupConversationsByTime,
  TIME_GROUP_LABELS,
} from "@/lib/ask/conversations/grouping";
import type { AskConversationSummary } from "@/lib/ask/conversations/types";
import Logo from "@/components/common/Logo";

interface AskCopilotSidebarProps {
  conversations: AskConversationSummary[];
  activeId: string | null;
  isLoggedIn: boolean;
  recentSearches: string[];
  onNewChat: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onSearchClick: (q: string) => void;
  onClose?: () => void;
}

const MARKET_CHIPS = [
  "Market today Tricity",
  "Top investments Mohali",
  "Hot projects Aerocity",
  "Highest rental yield",
];

export function AskCopilotSidebar({
  conversations,
  activeId,
  isLoggedIn,
  recentSearches,
  onNewChat,
  onSelect,
  onDelete,
  onSearchClick,
  onClose,
}: AskCopilotSidebarProps) {
  const groups = groupConversationsByTime(conversations);
  const groupKeys = (["today", "yesterday", "last7", "older"] as const).filter(
    (key) => groups[key].length > 0,
  );

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-r border-neutral-200/80 bg-[#F7F9F8]">
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-200/80 px-4 py-4">
        <div>
          <Logo size="footer" href="/" />
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
            AI Copilot
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted hover:bg-neutral-200 lg:hidden"
            aria-label="Close sidebar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : null}
      </div>

      <div className="shrink-0 space-y-2 p-3">
        <button
          type="button"
          onClick={onNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_2px_10px_rgba(34,197,94,0.3)] transition-all hover:brightness-105"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New conversation
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 pb-4">
        <SidebarSection title="Chat History">
          {conversations.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted">
              {isLoggedIn
                ? "Saved conversations appear here."
                : "Guest chats stay in this browser."}
            </p>
          ) : (
            groupKeys.map((key) => (
              <div key={key} className="mb-3">
                <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-label">
                  {TIME_GROUP_LABELS[key]}
                </p>
                <ul className="space-y-0.5">
                  {groups[key].map((c) => {
                    const active = c.id === activeId;
                    return (
                      <li key={c.id} className="group relative">
                        <button
                          type="button"
                          onClick={() => onSelect(c.id)}
                          className={`w-full rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors ${
                            active
                              ? "bg-emerald-50 font-medium text-emerald-900"
                              : "text-body hover:bg-white"
                          }`}
                        >
                          <span className="line-clamp-2">{c.title}</span>
                        </button>
                        <button
                          type="button"
                          aria-label="Delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(c.id);
                          }}
                          className="absolute right-1 top-1.5 hidden rounded p-1 text-muted hover:bg-neutral-200 group-hover:block"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </SidebarSection>

        <SidebarSection title="Recent Searches">
          {recentSearches.length === 0 ? (
            <p className="px-2 text-xs text-muted">Your recent asks show up here.</p>
          ) : (
            <ul className="space-y-0.5">
              {recentSearches.slice(0, 6).map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => onSearchClick(s)}
                    className="w-full rounded-lg px-2.5 py-1.5 text-left text-[12px] text-muted transition-colors hover:bg-white hover:text-heading-primary"
                  >
                    <span className="line-clamp-1">{s}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SidebarSection>

        <SidebarSection title="Collections">
          <div className="space-y-1">
            {MARKET_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => onSearchClick(chip)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] text-body transition-colors hover:bg-white"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {chip}
              </button>
            ))}
          </div>
        </SidebarSection>

        <SidebarSection title="Favorites">
          <Link
            href={isLoggedIn ? "/buyer/saved" : "/login?redirect=/buyer/saved"}
            className="block rounded-lg px-2.5 py-2 text-[12px] font-medium text-emerald-700 hover:bg-white"
          >
            Saved properties →
          </Link>
          <Link
            href={isLoggedIn ? "/buyer/compare" : "/login?redirect=/buyer/compare"}
            className="block rounded-lg px-2.5 py-2 text-[12px] font-medium text-emerald-700 hover:bg-white"
          >
            Compare list →
          </Link>
        </SidebarSection>
      </div>

      {!isLoggedIn ? (
        <div className="shrink-0 border-t border-neutral-200/80 px-4 py-3 text-[11px] leading-relaxed text-muted">
          Guest mode —{" "}
          <Link href="/login?redirect=/ask" className="font-semibold text-emerald-600 hover:underline">
            Sign in
          </Link>{" "}
          to sync history across devices.
        </div>
      ) : null}
    </aside>
  );
}

function SidebarSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-label">
        {title}
      </p>
      {children}
    </section>
  );
}
