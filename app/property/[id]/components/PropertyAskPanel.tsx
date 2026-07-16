"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  mapEngineResponseToTurn,
  queryAskEngine,
  type ConversationMessage,
  type PropertyContext,
} from "@/lib/ask/client";
import type { AskTurn } from "@/lib/ask/types";
import type { PropertyDetail } from "../data";
import { EMERALD, SparkIcon } from "./shared";

const SUGGESTIONS = [
  "Should I buy this?",
  "Compare with nearby projects",
  "Good for investment?",
  "Best negotiation price?",
  "Hidden risks?",
  "Builder review?",
  "Expected appreciation?",
  "Rental income?",
  "Nearby schools?",
  "Metro plans?",
];

interface PropertyAskPanelProps {
  property: PropertyDetail;
  compact?: boolean;
  /** Set on the primary in-viewport panel so hero Ask CTA can scroll to it */
  isPrimary?: boolean;
}

export default function PropertyAskPanel({
  property,
  compact = false,
  isPrimary = false,
}: PropertyAskPanelProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [turns, setTurns] = useState<AskTurn[]>([]);
  const [history, setHistory] = useState<ConversationMessage[]>([]);
  const [context, setContext] = useState<PropertyContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/properties/${property.id}/context`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data && !data.error) setContext(data as PropertyContext);
      })
      .catch(() => {
        if (!cancelled) {
          setContext({
            id: property.id,
            name: property.name,
            location: property.location,
            city: property.city,
            price: property.price,
            bhk: property.bhk,
            area: property.area,
            builderName: property.builder.name,
            growthScore: property.intelligenceReport?.growthScore.value ?? null,
            rentalYield: property.intelligenceReport?.rentalYield.value ?? null,
            possession: property.possession,
            propertyType: property.propertyType,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [property]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [turns, loading]);

  const ask = useCallback(
    async (message: string) => {
      const trimmed = message.trim();
      if (!trimmed || loading) return;
      setLoading(true);
      setError(null);
      setInput("");
      try {
        const response = await queryAskEngine(trimmed, history, context, [property.id]);
        const turn = mapEngineResponseToTurn(trimmed, response);
        setTurns((prev) => [...prev, turn]);
        setHistory((prev) => [
          ...prev,
          { role: "user", content: trimmed },
          { role: "assistant", content: response.answer },
        ]);
      } catch {
        setError("Could not reach AreaIQ AI. Try again or open full Ask.");
      } finally {
        setLoading(false);
      }
    },
    [loading, history, context, property.id],
  );

  return (
    <div
      id={isPrimary ? "property-ask-panel" : undefined}
      className={`flex flex-col overflow-hidden rounded-2xl border border-emerald-200/70 bg-gradient-to-b from-white to-emerald-50/40 shadow-[0_4px_24px_rgba(0,0,0,0.06)] ${
        compact ? "" : "min-h-[420px]"
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-emerald-100/80 px-4 py-3.5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white">
            <SparkIcon size={14} />
          </span>
          <div>
            <p className="text-sm font-bold text-heading-primary">Ask AI about this property</p>
            <p className="text-[11px] text-muted">Persistent intelligence panel</p>
          </div>
        </div>
        <Link
          href={`/ask?propertyId=${property.id}`}
          className="text-[11px] font-semibold text-emerald-700 hover:underline"
        >
          Full Ask →
        </Link>
      </div>

      <div className={`flex-1 space-y-3 overflow-y-auto px-4 py-3 ${compact ? "max-h-64" : "max-h-72 lg:max-h-80"}`}>
        {turns.length === 0 && !loading ? (
          <div className="space-y-2">
            <p className="text-xs text-muted">
              Ask anything about {property.name}. Examples:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
                  className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-medium text-body transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {turns.map((turn) => (
          <div key={turn.id} className="space-y-2">
            <div className="rounded-xl bg-neutral-100 px-3 py-2 text-xs font-medium text-body">
              {turn.userQuery}
            </div>
            <div className="rounded-xl border border-emerald-100 bg-white px-3 py-2.5">
              <p className="text-xs font-bold text-emerald-800">{turn.headline}</p>
              <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-body line-clamp-8">
                {(turn.aiContent ?? "").replace(/^##\s+.+\n/, "").trim()}
              </p>
            </div>
          </div>
        ))}

        {loading ? (
          <p className="text-xs font-medium text-emerald-700 animate-pulse">Analyzing with AreaIQ…</p>
        ) : null}
        {error ? <p className="text-xs text-rose-600">{error}</p> : null}
        <div ref={endRef} />
      </div>

      <form
        className="border-t border-emerald-100/80 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(input);
        }}
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this property…"
            className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-heading-primary outline-none ring-emerald-500/30 placeholder:text-muted focus:ring-2"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: EMERALD }}
          >
            Ask
          </button>
        </div>
      </form>
    </div>
  );
}
