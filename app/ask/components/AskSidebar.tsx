"use client";

import {
  groupConversationsByTime,
  TIME_GROUP_LABELS,
} from "@/lib/ask/conversations/grouping";
import type { AskConversationSummary } from "@/lib/ask/conversations/types";
import Logo from "@/components/common/Logo";

interface AskSidebarProps {
  conversations: AskConversationSummary[];
  activeId: string | null;
  isLoggedIn: boolean;
  onNewChat: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onClose?: () => void;
}

function ConversationList({
  items,
  activeId,
  onSelect,
  onDelete,
}: {
  items: AskConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <ul className="space-y-0.5">
      {items.map((conversation) => {
        const active = conversation.id === activeId;
        return (
          <li key={conversation.id} className="group relative">
            <button
              type="button"
              onClick={() => onSelect(conversation.id)}
              className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                active
                  ? "bg-emerald-50 text-emerald-900"
                  : "text-body hover:bg-neutral-100"
              }`}
            >
              <span className="line-clamp-2 font-medium">{conversation.title}</span>
            </button>
            <button
              type="button"
              aria-label="Delete conversation"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(conversation.id);
              }}
              className="absolute right-2 top-2 hidden rounded p-1 text-muted hover:bg-neutral-200 hover:text-body group-hover:block"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function AskSidebar({
  conversations,
  activeId,
  isLoggedIn,
  onNewChat,
  onSelect,
  onDelete,
  onClose,
}: AskSidebarProps) {
  const groups = groupConversationsByTime(conversations);
  const groupKeys = (["today", "yesterday", "last7", "older"] as const).filter(
    (key) => groups[key].length > 0,
  );

  return (
    <aside className="flex h-full w-full flex-col border-r border-neutral-200 bg-neutral-50">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-4">
        <Logo size="footer" href="/" />
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

      <div className="p-3">
        <button
          type="button"
          onClick={onNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-heading-secondary shadow-sm transition-colors hover:bg-neutral-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {conversations.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted">
            {isLoggedIn
              ? "Your conversations are saved to your account."
              : "Chats saved in this browser only."}
          </p>
        ) : (
          groupKeys.map((key) => (
            <div key={key} className="mb-4">
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-label">
                {TIME_GROUP_LABELS[key]}
              </p>
              <ConversationList
                items={groups[key]}
                activeId={activeId}
                onSelect={onSelect}
                onDelete={onDelete}
              />
            </div>
          ))
        )}
      </div>

      {!isLoggedIn ? (
        <div className="border-t border-neutral-200 px-4 py-3 text-xs text-muted">
          Guest mode — chats stored in this browser.{" "}
          <a href="/login" className="font-medium text-emerald-600 hover:underline">
            Sign in
          </a>{" "}
          to save permanently.
        </div>
      ) : null}
    </aside>
  );
}
