"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { PropertyContext } from "@/lib/ask/client";
import { useAskChat } from "@/lib/ask/conversations/useAskChat";
import { AskChatThread } from "./components/chat/AskChatThread";
import { AskComposer } from "./components/chat/AskComposer";
import { AskIntelPanel } from "./components/intel/AskIntelPanel";
import { AskCopilotSidebar } from "./components/sidebar/AskCopilotSidebar";
import { getLatestAssistantMessage } from "./lib/turnFromMessage";

function AskPageContent() {
  const searchParams = useSearchParams();
  const didAutoSend = useRef(false);
  const [intelOpen, setIntelOpen] = useState(false);
  const [headerElevated, setHeaderElevated] = useState(false);

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
          if (ctx) setPropertyContext(ctx);
        })
        .catch(() => {});
    }

    if (!q || didAutoSend.current || !hydrated) return;
    didAutoSend.current = true;
    sendMessage(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, hydrated]);

  const messages = activeConversation?.messages ?? [];
  const latestAssistant = useMemo(
    () => getLatestAssistantMessage(messages),
    [messages],
  );

  // Auto-open intel on mobile when properties arrive
  useEffect(() => {
    if (latestAssistant?.properties && latestAssistant.properties.length > 0) {
      // Desktop panel is always visible; hint mobile users via state only when they tap
    }
  }, [latestAssistant]);

  const handleNewChat = async () => {
    await startNewChat(propertyContext);
    setSidebarOpen(false);
  };

  if (authLoading || !hydrated) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#F7F9F8] pt-16">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-white pt-16">
      {sidebarOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      ) : null}

      {intelOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setIntelOpen(false)}
          aria-hidden
        />
      ) : null}

      {/* Left sidebar — drawer <1024px, fixed column on desktop */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(100%,300px)] transform flex-col pt-16 transition-transform duration-300 ease-out lg:static lg:z-0 lg:h-full lg:w-[300px] lg:shrink-0 lg:translate-x-0 lg:pt-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <AskCopilotSidebar
          conversations={conversations}
          activeId={activeConversation?.id ?? null}
          isLoggedIn={isLoggedIn}
          recentSearches={recentSearches}
          onNewChat={handleNewChat}
          onSelect={loadConversation}
          onDelete={deleteConversation}
          onSearchClick={sendMessage}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Center chat — fills remaining width/height */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#fafbfa_100%)]">
        <header
          className={`z-10 flex shrink-0 items-center gap-2 border-b border-neutral-200/80 bg-white/95 px-3 py-2.5 backdrop-blur-md transition-shadow duration-200 sm:px-4 ${
            headerElevated ? "shadow-[0_4px_16px_rgba(0,0,0,0.06)]" : "shadow-none"
          }`}
        >
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-body hover:bg-neutral-100 lg:hidden"
            aria-label="Open conversations"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-heading-primary">
              {activeConversation?.title ?? "AreaIQ Intelligence"}
            </p>
            <p className="hidden text-[11px] text-muted sm:block">
              Powered by Tech172 Intelligence
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIntelOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 lg:hidden"
          >
            <span aria-hidden>✨</span>
            Insights
            {latestAssistant?.properties?.length
              ? ` · ${latestAssistant.properties.length}`
              : ""}
          </button>
        </header>

        <AskChatThread
          messages={messages}
          propertyContext={propertyContext}
          loading={loading}
          typingStatus={typingStatus}
          messagesEndRef={messagesEndRef}
          onFollowUp={sendMessage}
          onOpenIntel={() => setIntelOpen(true)}
          onScrollElevated={setHeaderElevated}
        />

        <AskComposer
          onSubmit={sendMessage}
          loading={loading}
          recentSearches={recentSearches}
        />
      </div>

      {/* Right intel panel — desktop 1024+ */}
      <div className="hidden h-full min-h-0 w-[360px] shrink-0 overflow-hidden lg:block">
        <AskIntelPanel
          latestAssistant={latestAssistant}
          propertyContext={propertyContext}
          loading={loading}
          onAction={sendMessage}
        />
      </div>

      {/* Intel — mobile/tablet bottom sheet (<1024px) */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 flex max-h-[min(88dvh,720px)] transform flex-col transition-transform duration-300 ease-out lg:hidden ${
          intelOpen ? "translate-y-0 pointer-events-auto" : "translate-y-full pointer-events-none"
        }`}
        role="dialog"
        aria-modal={intelOpen}
        aria-hidden={!intelOpen}
        aria-label="Insights"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-2xl border border-neutral-200/80 bg-[#FAFBFA] shadow-[0_-12px_40px_rgba(0,0,0,0.14)]">
          <div className="flex shrink-0 justify-center pb-1 pt-2.5" aria-hidden>
            <span className="h-1 w-10 rounded-full bg-neutral-300" />
          </div>
          <AskIntelPanel
            latestAssistant={latestAssistant}
            propertyContext={propertyContext}
            loading={loading}
            presentation="sheet"
            onAction={(q) => {
              setIntelOpen(false);
              sendMessage(q);
            }}
            onClose={() => setIntelOpen(false)}
          />
        </div>
      </div>
    </div>
  );
}

export default function AskPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center bg-[#F7F9F8] pt-16">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
        </div>
      }
    >
      <AskPageContent />
    </Suspense>
  );
}
