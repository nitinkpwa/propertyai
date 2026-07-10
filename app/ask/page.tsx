"use client";

import { useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { PropertyContext } from "@/lib/ask/client";
import { useAskChat } from "@/lib/ask/conversations/useAskChat";
import { AskChatInput } from "./components/AskChatInput";
import { AskChatMessages } from "./components/AskChatMessages";
import { AskSidebar } from "./components/AskSidebar";

function AskPageContent() {
  const searchParams = useSearchParams();
  const didAutoSend = useRef(false);

  const {
    isLoggedIn,
    authLoading,
    hydrated,
    conversations,
    activeConversation,
    recentSearches,
    propertyContext,
    setPropertyContext,
    loading,
    typingStatus,
    sidebarOpen,
    setSidebarOpen,
    messagesEndRef,
    startNewChat,
    loadConversation,
    deleteConversation,
    sendMessage,
  } = useAskChat(null);

  useEffect(() => {
    const propertyId = searchParams.get("propertyId");
    const q = searchParams.get("q");

    if (propertyId) {
      fetch(`/api/properties/${propertyId}/context`)
        .then((res) => (res.ok ? res.json() : null))
        .then((ctx: PropertyContext | null) => {
          if (ctx) {
            setPropertyContext(ctx);
          }
        })
        .catch(() => {});
    }

    if (!q || didAutoSend.current || !hydrated) return;
    didAutoSend.current = true;
    sendMessage(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, hydrated]);

  const handleNewChat = async () => {
    await startNewChat(propertyContext);
    setSidebarOpen(false);
  };

  if (authLoading || !hydrated) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-neutral-50">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white pt-16">
      {/* Mobile sidebar overlay */}
      {sidebarOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      ) : null}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 transform pt-16 transition-transform lg:static lg:z-0 lg:w-64 lg:translate-x-0 lg:pt-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <AskSidebar
          conversations={conversations}
          activeId={activeConversation?.id ?? null}
          isLoggedIn={isLoggedIn}
          onNewChat={handleNewChat}
          onSelect={loadConversation}
          onDelete={deleteConversation}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main chat area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-body hover:bg-neutral-100"
            aria-label="Open conversations"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="truncate text-sm font-semibold text-heading-primary">
            {activeConversation?.title ?? "AreaIQ Intelligence"}
          </span>
        </header>

        <AskChatMessages
          messages={activeConversation?.messages ?? []}
          propertyContext={propertyContext}
          loading={loading}
          typingStatus={typingStatus}
          messagesEndRef={messagesEndRef}
          onFollowUp={sendMessage}
        />

        <AskChatInput
          onSubmit={sendMessage}
          loading={loading}
          recentSearches={recentSearches}
        />
      </div>
    </div>
  );
}

export default function AskPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-neutral-50 pt-16">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
        </div>
      }
    >
      <AskPageContent />
    </Suspense>
  );
}
