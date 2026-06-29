"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  AskChipRow,
  AskHero,
  AskLoadingCard,
  AskRecommendedProperties,
  AskResponseCard,
  AskUserQueryCard,
} from "./components/AskConversation";
import { mapEngineResponseToTurn, queryAskEngine, type ConversationMessage } from "@/lib/ask/client";
import {
  getFollowUpConfig,
  getQuickActionConfig,
  STARTER_SUGGESTIONS,
  type FollowUpOption,
  type QuickAction,
} from "@/lib/ask/followUps";
import { computeSearchStats, getTypingStatus } from "@/lib/ask/responses";
import { sortAskListings } from "@/lib/ask/sort";
import { filterProperties } from "@/lib/properties/filterProperties";
import type { ListingProperty, PropertyFilterState } from "@/lib/properties/types";
import { DEFAULT_FILTER_STATE } from "@/lib/properties/types";
import type { AskTurn } from "@/lib/ask/types";

const SESSION_KEY = "areaiq-ask-session-v6";

type TypingPhase = "understanding" | "searching" | "responding";

function AskPageContent() {
  const searchParams = useSearchParams();
  const didAutoSend = useRef(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [typingPhase, setTypingPhase] = useState<TypingPhase>("understanding");
  const [turn, setTurn] = useState<AskTurn | null>(null);
  const [lastSourceListings, setLastSourceListings] = useState<ListingProperty[]>([]);
  const [lastQuery, setLastQuery] = useState("");
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        turn: AskTurn | null;
        lastSourceListings: ListingProperty[];
        lastQuery: string;
        conversationHistory?: ConversationMessage[];
      };
      if (saved.turn) setTurn(saved.turn);
      if (saved.lastSourceListings) setLastSourceListings(saved.lastSourceListings);
      if (saved.lastQuery) setLastQuery(saved.lastQuery);
      if (saved.conversationHistory) setConversationHistory(saved.conversationHistory);
    } catch (error) {
      console.error("Failed to restore ask session:", error);
    }
  }, []);

  useEffect(() => {
    if (!turn) return;
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ turn, lastSourceListings, lastQuery, conversationHistory }),
      );
    } catch (error) {
      console.error("Failed to persist ask session:", error);
    }
  }, [turn, lastSourceListings, lastQuery, conversationHistory]);

  useEffect(() => {
    if (turn && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [turn?.id]);

  useEffect(() => {
    const q = searchParams.get("q");
    if (!q || didAutoSend.current) return;
    didAutoSend.current = true;
    runSearch(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const runSearch = async (text?: string) => {
    const messageText = (text ?? query).trim();
    if (!messageText || loading) return;

    setQuery("");
    setLoading(true);
    setTypingPhase("understanding");
    setLastQuery(messageText);

    try {
      setTypingPhase("understanding");
      const engineResponse = await queryAskEngine(messageText, conversationHistory);

      setTypingPhase(engineResponse.searchedDatabase ? "searching" : "responding");

      const mappedTurn = mapEngineResponseToTurn(messageText, engineResponse);
      setTurn(mappedTurn);
      setLastSourceListings(engineResponse.properties);
      setConversationHistory((prev) => [
        ...prev,
        { role: "user", content: messageText },
        { role: "assistant", content: engineResponse.answer },
      ]);
    } catch (error) {
      console.error("Ask engine error:", error);
      setTurn({
        id: crypto.randomUUID(),
        userQuery: messageText,
        intent: "knowledge",
        headline: "Something went wrong while processing your request.",
        subtext: "Please try again.",
        aiContent: null,
        sections: [],
        stats: null,
        listings: [],
        isSimilar: false,
        quickActions: [],
        followUps: [],
      });
      setLastSourceListings([]);
    } finally {
      setLoading(false);
      setTypingPhase("understanding");
    }
  };

  const applyListingsUpdate = (
    userMessage: string,
    listings: ListingProperty[],
    headline: string,
    subtext: string | null = "Here are the updated results.",
  ) => {
    setLastSourceListings(listings);
    setTurn((prev) =>
      prev
        ? {
            ...prev,
            userQuery: userMessage,
            headline,
            subtext,
            stats: computeSearchStats(listings),
            listings,
            quickActions: listings.length > 0 ? prev.quickActions : [],
          }
        : null,
    );
  };

  const handleQuickAction = async (action: QuickAction) => {
    if (loading) return;
    const config = getQuickActionConfig(action);

    if (config.appendQuery) {
      await runSearch(`${lastQuery} ${config.appendQuery}`.trim());
      return;
    }

    if (config.compareMode) {
      setTurn((prev) =>
        prev
          ? {
              ...prev,
              userQuery: "Compare these properties",
              headline: `Comparing ${lastSourceListings.length} properties on price, rental yield, and AreaIQ score.`,
              subtext: "Open each listing for full details.",
              aiContent: lastSourceListings
                .slice(0, 4)
                .map(
                  (p) =>
                    `**${p.name}** — ${p.location} · ${p.bhk} BHK · Yield ${p.rentalYield}% · Score ${p.growthScore}/100`,
                )
                .join("\n\n"),
              listings: lastSourceListings,
            }
          : null,
      );
      return;
    }

    setLoading(true);
    try {
      let listings = [...lastSourceListings];

      if (config.possession?.length) {
        listings = filterProperties(listings, {
          ...DEFAULT_FILTER_STATE,
          possession: config.possession,
        });
      }

      if (config.filterInvestment) {
        listings = sortAskListings(listings, "growthScore", "desc");
      }

      if (config.filterLuxury) {
        listings = listings.filter((p) => p.price >= 10_000_000);
      }

      if (config.filterBuilderFloor) {
        listings = listings.filter((p) => p.propertyType === "builder-floor");
      }

      if (config.sortKey) {
        listings = sortAskListings(listings, config.sortKey, config.sortDirection ?? "desc");
      }

      applyListingsUpdate(action, listings, `Showing ${listings.length} properties — ${action}.`);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowUp = async (option: FollowUpOption) => {
    if (loading) return;
    const config = getFollowUpConfig(option);

    if (config.appendQuery || config.emiMode) {
      const message = config.emiMode
        ? `${lastQuery} calculate EMI home loan`
        : `${lastQuery} ${config.appendQuery ?? ""}`.trim();
      await runSearch(message);
      return;
    }

    if (config.compareMode) {
      await runSearch("Compare builders for these properties");
      return;
    }

    setLoading(true);
    try {
      let listings = [...lastSourceListings];

      if (config.possession?.length) {
        const filters: PropertyFilterState = {
          ...DEFAULT_FILTER_STATE,
          possession: config.possession,
        };
        listings = filterProperties(listings, filters);
      }

      if (config.sortKey) {
        listings = sortAskListings(listings, config.sortKey, config.sortDirection ?? "desc");
      }

      applyListingsUpdate(config.userMessage, listings, `Updated results — ${option}.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 pt-16">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <AskHero
          query={query}
          onChange={setQuery}
          onSubmit={() => runSearch()}
          loading={loading}
          suggestions={STARTER_SUGGESTIONS}
          onSuggestionClick={runSearch}
          showSuggestions={!turn && !loading}
        />

        <div ref={resultsRef} className="mt-10 space-y-6">
          {turn && !loading ? (
            <>
              <AskUserQueryCard query={turn.userQuery} />
              <AskResponseCard turn={turn} />

              {turn.listings.length > 0 ? (
                <AskRecommendedProperties
                  listings={turn.listings}
                  label={
                    turn.intent === "search" || turn.intent === "investment"
                      ? "Property Results"
                      : "Recommended Properties"
                  }
                />
              ) : null}

              {turn.quickActions.length > 0 ? (
                <AskChipRow
                  title="Quick Actions"
                  options={turn.quickActions}
                  onSelect={(option) => handleQuickAction(option as QuickAction)}
                />
              ) : null}

              {turn.followUps.length > 0 ? (
                <AskChipRow
                  title="Suggested Follow-up"
                  options={turn.followUps}
                  onSelect={(option) => handleFollowUp(option as FollowUpOption)}
                />
              ) : null}
            </>
          ) : null}

          {loading ? (
            <AskLoadingCard status={getTypingStatus(typingPhase)} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function AskPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-neutral-50 pt-16">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
        </div>
      }
    >
      <AskPageContent />
    </Suspense>
  );
}
