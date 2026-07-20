"use client";

import { useRef, useState } from "react";

const QUICK_TYPES = ["Apartment", "Villa", "Plot", "Builder Floor"] as const;

interface AskComposerProps {
  onSubmit: (text: string) => void;
  loading: boolean;
  recentSearches: string[];
}

export function AskComposer({ onSubmit, loading, recentSearches }: AskComposerProps) {
  const [query, setQuery] = useState("");
  const [budgetLakh, setBudgetLakh] = useState(80);
  const [showTools, setShowTools] = useState(false);
  const [propertyType, setPropertyType] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    let text = query.trim();
    if (!text || loading) return;
    if (propertyType) text = `${propertyType}: ${text}`;
    if (showTools && budgetLakh > 0 && !/₹|lakh|cr/i.test(text)) {
      text = `${text} under ₹${budgetLakh} lakh`;
    }
    setQuery("");
    onSubmit(text);
  };

  const startVoice = () => {
    const SpeechRecognition =
      typeof window !== "undefined"
        ? (window as unknown as {
            SpeechRecognition?: new () => {
              start: () => void;
              onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
              continuous: boolean;
              interimResults: boolean;
              lang: string;
            };
            webkitSpeechRecognition?: new () => {
              start: () => void;
              onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
              continuous: boolean;
              interimResults: boolean;
              lang: string;
            };
          }).SpeechRecognition ||
          (window as unknown as { webkitSpeechRecognition?: new () => {
            start: () => void;
            onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
            continuous: boolean;
            interimResults: boolean;
            lang: string;
          } }).webkitSpeechRecognition
        : undefined;

    if (!SpeechRecognition) {
      setQuery((q) => q || "Voice not supported in this browser — type your question");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) setQuery((q) => (q ? `${q} ${transcript}` : transcript));
    };
    recognition.start();
  };

  return (
    <div className="shrink-0 border-t border-neutral-200/80 bg-white/95 px-3 pt-3 backdrop-blur-md sm:px-5 sm:pt-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-[1100px]">
        {recentSearches.length > 0 ? (
          <div className="mb-2.5 flex gap-2 overflow-x-auto scroll-touch pb-1 sm:flex-wrap sm:overflow-visible">
            {recentSearches.slice(0, 5).map((search) => (
              <button
                key={search}
                type="button"
                onClick={() => onSubmit(search)}
                disabled={loading}
                className="shrink-0 rounded-full border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-sm font-medium text-body hover:border-emerald-200 hover:bg-emerald-50 disabled:opacity-50"
              >
                {search.length > 32 ? `${search.slice(0, 31)}…` : search}
              </button>
            ))}
          </div>
        ) : null}

        {showTools ? (
          <div className="mb-2.5 space-y-2 rounded-2xl border border-neutral-100 bg-neutral-50/80 p-3">
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPropertyType((prev) => (prev === t ? null : t))}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                    propertyType === t
                      ? "bg-emerald-500 text-white"
                      : "bg-white text-body ring-1 ring-neutral-200"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-label">
                Budget · ₹{budgetLakh} L
              </span>
              <input
                type="range"
                min={20}
                max={500}
                step={5}
                value={budgetLakh}
                onChange={(e) => setBudgetLakh(Number(e.target.value))}
                className="mt-1 w-full accent-emerald-500"
              />
            </label>
          </div>
        ) : null}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="flex items-end gap-2 rounded-[1.35rem] border border-neutral-200 bg-white px-3 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.06)] focus-within:border-emerald-300 focus-within:ring-4 focus-within:ring-emerald-100/80"
        >
          <div className="flex shrink-0 gap-0.5 pb-1">
            <button
              type="button"
              onClick={() => setShowTools((v) => !v)}
              className={`rounded-xl p-2 transition-colors ${
                showTools ? "bg-emerald-50 text-emerald-700" : "text-muted hover:bg-neutral-100"
              }`}
              aria-label="Tools"
              title="Budget & type filters"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-xl p-2 text-muted hover:bg-neutral-100"
              aria-label="Upload image"
              title="Attach image context"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={() => {
                setQuery((q) =>
                  q
                    ? `${q} (analyze attached property image)`
                    : "Analyze this property image for investment potential",
                );
              }}
            />
            <button
              type="button"
              onClick={startVoice}
              className="rounded-xl p-2 text-muted hover:bg-neutral-100"
              aria-label="Voice input"
              title="Voice input"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          </div>

          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Ask anything — properties, areas, EMI, builders…"
            disabled={loading}
            rows={1}
            className="max-h-36 min-h-[48px] flex-1 resize-none bg-transparent py-3 text-base text-heading-primary outline-none placeholder:text-placeholder disabled:opacity-60"
          />

          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="mb-0.5 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-[0_2px_10px_var(--brand-shadow)] transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
            aria-label="Send"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </form>

        <p className="mt-1.5 text-center text-[10px] text-muted">
          Live AreaIQ listings · Advisor tone · Never fabricates property data
        </p>
      </div>
    </div>
  );
}
