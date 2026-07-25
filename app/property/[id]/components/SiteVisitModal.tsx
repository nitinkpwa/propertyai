"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { invalidateBuyerNotifications } from "@/lib/buyer/notifications";
import {
  devLogSiteVisit,
  mapSiteVisitError,
  PROPERTY_UUID_RE,
} from "@/lib/crm/siteVisitErrors";
import { useProgressiveProfileOptional } from "@/components/buyer/ProgressiveProfileProvider";
import { SITE_VISIT_BOOKED_EVENT } from "@/lib/crm/events";
import { useOverlay } from "@/lib/layout/overlay";
import { buildLoginUrlForBookVisit } from "./BookSiteVisitProvider";
import { CloseIcon, EMERALD } from "./shared";
import {
  type AvailabilityStatus,
  type LanguageOption,
  type PurposeChip,
  type TransportOption,
  type VisitorOption,
  INCLUDED_ITEMS,
  LANGUAGE_OPTIONS,
  NEXT_STEPS,
  PURPOSE_CHIPS,
  TRANSPORT_OPTIONS,
  VISIT_TIME_GROUPS,
  VISITOR_OPTIONS,
  buildPurposePayload,
  computeProgressStep,
  formatReferenceId,
  formatTimeLabel,
  friendlyBookingError,
  getAiRecommendedSlot,
  getNextAvailableSlot,
} from "./siteVisitConcierge";

interface SiteVisitModalProps {
  propertyId: string;
  propertyName: string;
  builderName?: string;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type LoanAssist = "" | "yes" | "no";

const PROGRESS_STEPS = [
  { id: 1, label: "Date" },
  { id: 2, label: "Time" },
  { id: 3, label: "Purpose" },
  { id: 4, label: "Submit" },
] as const;

export default function SiteVisitModal({
  propertyId,
  propertyName,
  builderName,
  open,
  onClose,
  onSuccess,
}: SiteVisitModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile } = useAuth();
  const profilePrompt = useProgressiveProfileOptional();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const submittingRef = useRef(false);
  const { zClassName } = useOverlay("modal", open, onClose);

  const [visitDate, setVisitDate] = useState("");
  const [visitTime, setVisitTime] = useState("11:00");
  const [purposeChip, setPurposeChip] = useState<PurposeChip | "">("");
  const [purposeCustom, setPurposeCustom] = useState("");
  const [visitors, setVisitors] = useState<VisitorOption | "">("");
  const [loanAssist, setLoanAssist] = useState<LoanAssist>("");
  const [language, setLanguage] = useState<LanguageOption>("English");
  const [transport, setTransport] = useState<TransportOption | "">("");
  const [buyerNotes, setBuyerNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilityStatus>("loading");
  const [waitlistJoined, setWaitlistJoined] = useState(false);
  const [successVisitId, setSuccessVisitId] = useState<string | null>(null);

  const aiSlot = useMemo(() => getAiRecommendedSlot(), []);
  const nextSlot = useMemo(() => getNextAvailableSlot(), []);
  const minDate = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const progressStep = computeProgressStep({
    visitDate,
    visitTime,
    purposeChip,
    purposeCustom,
    buyerNotes,
  });
  const bookingBlocked = availability === "unavailable" || availability === "loading";

  const displayName = profile?.full_name?.trim() || null;
  const displayPhone = profile?.phone?.trim() || null;
  const displayEmail = profile?.email?.trim() || user?.email || null;

  const redirectToLogin = useCallback(() => {
    router.push(buildLoginUrlForBookVisit(pathname, propertyId));
  }, [router, pathname, propertyId]);

  useEffect(() => {
    if (!open) return;
    devLogSiteVisit("Concierge drawer opened", { propertyId, propertyName });
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    }, 50);
    return () => window.clearTimeout(t);
  }, [open, propertyId, propertyName]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setAvailability("loading");
    setError(null);
    setWaitlistJoined(false);
    setSuccessVisitId(null);

    const normalized = propertyId?.trim() ?? "";
    if (!normalized || !PROPERTY_UUID_RE.test(normalized)) {
      setAvailability("unavailable");
      return;
    }

    void (async () => {
      try {
        const res = await fetch(
          `/api/crm/site-visit/availability?propertyId=${encodeURIComponent(normalized)}`,
        );
        const data = (await res.json().catch(() => ({}))) as {
          available?: boolean;
          message?: string;
        };
        if (cancelled) return;
        if (data.available) {
          setAvailability("available");
        } else {
          setAvailability("unavailable");
          if (data.message) setError(data.message);
        }
      } catch {
        if (cancelled) return;
        // Fail open for active listings when the preflight call fails —
        // booking API still enforces availability.
        setAvailability("available");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, propertyId]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submittingRef.current) {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const normalizedId = propertyId?.trim() ?? "";

  const applyRecommendedSlot = () => {
    if (!aiSlot) return;
    setVisitDate(aiSlot.dateIso);
    setVisitTime(aiSlot.time);
  };

  const handlePurposeChip = (chip: PurposeChip) => {
    setPurposeChip(chip);
    if (chip !== "Other") {
      setPurposeCustom("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    if (bookingBlocked) return;

    setError(null);

    if (!user) {
      onClose();
      redirectToLogin();
      return;
    }

    if (profile?.role !== "buyer") {
      setError("Please continue as a Buyer to book a site visit.");
      return;
    }

    if (!normalizedId || !PROPERTY_UUID_RE.test(normalizedId)) {
      setError("Unable to identify this property. Please refresh the page.");
      return;
    }

    if (!visitDate) {
      setError("Please choose a preferred visit date.");
      return;
    }

    if (visitDate < minDate) {
      setError("Please choose a date today or in the future.");
      return;
    }

    if (!visitTime) {
      setError("Please choose a preferred visit time.");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);

    const purpose = buildPurposePayload({
      purposeChip,
      purposeCustom,
      visitors,
      loanAssist,
      language,
      transport,
      buyerNotes,
    });

    const payload = {
      propertyId: normalizedId,
      visitDate,
      visitTime,
      purpose,
      builderName,
    };

    devLogSiteVisit("Submitting concierge booking", {
      propertyId: normalizedId,
      buyerId: user.id,
      payload,
    });

    try {
      const res = await fetch("/api/crm/site-visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data: { error?: string; code?: string; visitId?: string } = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (res.status === 401) {
        onClose();
        redirectToLogin();
        return;
      }

      if (!res.ok) {
        const mapped = mapSiteVisitError(res.status, data);
        const friendly = friendlyBookingError(mapped.code, mapped.message);
        if (friendly.availability) setAvailability(friendly.availability);
        setError(friendly.message);
        submittingRef.current = false;
        setSubmitting(false);
        return;
      }

      window.dispatchEvent(
        new CustomEvent(SITE_VISIT_BOOKED_EVENT, {
          detail: { visitId: data.visitId, propertyId: normalizedId },
        }),
      );
      invalidateBuyerNotifications(user.id);

      onSuccess?.();
      setSuccessVisitId(data.visitId ?? "pending");
      submittingRef.current = false;
      setSubmitting(false);
      void profilePrompt?.promptIfNeeded("site_visit");
    } catch (cause) {
      devLogSiteVisit("Network error", { cause, propertyId: normalizedId });
      const mapped = mapSiteVisitError(0, null, cause);
      const friendly = friendlyBookingError(mapped.code, mapped.message);
      setError(friendly.message);
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className={`fixed inset-0 ${zClassName}`} role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-neutral-950/40 backdrop-blur-[2px] transition-opacity"
        onClick={submitting ? undefined : onClose}
        aria-label="Close booking panel"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-x-0 bottom-0 flex max-h-[92vh] flex-col overflow-hidden rounded-t-3xl border border-white/60 bg-white/95 shadow-[0_-12px_48px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[min(100%,520px)] sm:rounded-none sm:rounded-l-3xl sm:border-y-0 sm:border-l sm:border-r-0 sm:shadow-[-16px_0_48px_rgba(0,0,0,0.12)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-neutral-100/80 px-5 pb-4 pt-4 sm:px-6 sm:pt-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-600">
              AreaIQ Concierge
            </p>
            <h2 id={titleId} className="mt-1 text-xl font-bold tracking-tight text-neutral-950 sm:text-2xl">
              Schedule Property Visit
            </h2>
            <p className="mt-1 truncate text-sm font-medium text-neutral-700">{propertyName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-full p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
          {successVisitId ? (
            <SuccessPanel
              referenceId={formatReferenceId(successVisitId)}
              onContinue={onClose}
            />
          ) : (
            <>
              <p className="text-sm leading-relaxed text-neutral-600">
                AreaIQ will coordinate with the builder or assigned Connect Partner and confirm your
                preferred visit time.
              </p>

              <AvailabilityCard
                status={availability}
                nextLabel={
                  availability === "unavailable" || availability === "loading"
                    ? undefined
                    : nextSlot.label
                }
                waitlistJoined={waitlistJoined}
                onJoinWaitlist={() => setWaitlistJoined(true)}
              />

              {availability !== "unavailable" ? (
                <>
              <ProgressIndicator current={progressStep} />

              {aiSlot ? (
                <section className="mt-5 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/90 to-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                        AI Recommended Slot
                      </p>
                      <p className="mt-1 text-lg font-bold text-neutral-950">
                        {aiSlot.dayLabel}
                        <span className="mx-2 text-neutral-300">·</span>
                        {aiSlot.timeLabel}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={applyRecommendedSlot}
                      disabled={submitting || bookingBlocked}
                      className="shrink-0 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                    >
                      Use slot
                    </button>
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {aiSlot.reasons.map((reason) => (
                      <li key={reason} className="flex items-start gap-2 text-xs text-neutral-600">
                        <span className="mt-0.5 text-emerald-500" aria-hidden>
                          •
                        </span>
                        {reason}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section className="mt-5 rounded-2xl border border-neutral-100 bg-neutral-50/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                  Included
                </p>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {INCLUDED_ITEMS.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs text-neutral-700">
                      <CheckMark />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {(displayName || displayPhone || displayEmail) && (
                <section className="mt-5 rounded-2xl border border-neutral-100 bg-white/70 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                    Your details
                  </p>
                  <dl className="mt-3 space-y-2 text-sm">
                    {displayName ? (
                      <DetailRow label="Name" value={displayName} />
                    ) : null}
                    {displayPhone ? (
                      <DetailRow label="Phone" value={displayPhone} />
                    ) : null}
                    {displayEmail ? (
                      <DetailRow label="Email" value={displayEmail} />
                    ) : null}
                    <DetailRow label="Language" value={language} />
                  </dl>
                </section>
              )}

              <form id="site-visit-concierge-form" onSubmit={handleSubmit} className="mt-6 space-y-6">
                <fieldset disabled={submitting || bookingBlocked} className="space-y-6">
                  <FieldBlock label="Select Date" htmlFor="visit-date" required>
                    <input
                      id="visit-date"
                      type="date"
                      min={minDate}
                      value={visitDate}
                      onChange={(e) => setVisitDate(e.target.value)}
                      required
                      className={inputClass}
                    />
                  </FieldBlock>

                  <FieldBlock label="Available Time Slots" htmlFor="visit-time" required>
                    <div className="space-y-4">
                      {VISIT_TIME_GROUPS.map((group) => (
                        <div key={group.id}>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">
                            {group.label}
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {group.times.map((t) => {
                              const selected = visitTime === t;
                              return (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => setVisitTime(t)}
                                  aria-pressed={selected}
                                  className={`rounded-xl border px-2 py-2.5 text-sm font-semibold transition ${
                                    selected
                                      ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                                      : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                                  }`}
                                >
                                  {formatTimeLabel(t)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    <input id="visit-time" type="hidden" value={visitTime} required />
                  </FieldBlock>

                  <FieldBlock label="Buyer Notes" htmlFor="buyer-notes" optional>
                    <textarea
                      id="buyer-notes"
                      value={buyerNotes}
                      onChange={(e) => setBuyerNotes(e.target.value)}
                      rows={3}
                      placeholder="Anything we should know before your visit?"
                      className={`${inputClass} resize-y`}
                    />
                  </FieldBlock>

                  <FieldBlock label="Visit purpose" optional>
                    <div className="flex flex-wrap gap-2">
                      {PURPOSE_CHIPS.map((chip) => {
                        const selected = purposeChip === chip;
                        return (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => handlePurposeChip(chip)}
                            aria-pressed={selected}
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                              selected
                                ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                                : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
                            }`}
                          >
                            {chip}
                          </button>
                        );
                      })}
                    </div>
                    {(purposeChip === "Other" || purposeChip === "") && (
                      <input
                        id="visit-purpose"
                        type="text"
                        value={purposeCustom}
                        onChange={(e) => setPurposeCustom(e.target.value)}
                        placeholder={
                          purposeChip === "Other"
                            ? "Tell us more about your purpose"
                            : "Or type a custom purpose"
                        }
                        className={`${inputClass} mt-3`}
                      />
                    )}
                  </FieldBlock>

                  <FieldBlock label="Who is visiting?" optional>
                    <OptionRow
                      options={VISITOR_OPTIONS}
                      value={visitors}
                      onChange={setVisitors}
                      name="visitors"
                    />
                  </FieldBlock>

                  <FieldBlock label="Need Home Loan Assistance?" optional>
                    <div className="flex gap-2">
                      {(
                        [
                          { value: "yes", label: "Yes" },
                          { value: "no", label: "No" },
                        ] as const
                      ).map((opt) => {
                        const selected = loanAssist === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setLoanAssist(opt.value)}
                            aria-pressed={selected}
                            className={`min-w-[88px] rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                              selected
                                ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                                : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </FieldBlock>

                  <FieldBlock label="Preferred language" optional>
                    <OptionRow
                      options={LANGUAGE_OPTIONS}
                      value={language}
                      onChange={setLanguage}
                      name="language"
                    />
                  </FieldBlock>

                  <FieldBlock label="How will you arrive?" optional>
                    <OptionRow
                      options={TRANSPORT_OPTIONS}
                      value={transport}
                      onChange={setTransport}
                      name="transport"
                    />
                  </FieldBlock>
                </fieldset>

                {error ? (
                  <p
                    role="alert"
                    className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-950"
                  >
                    {error}
                  </p>
                ) : null}

                <section className="rounded-2xl border border-neutral-100 bg-neutral-50/80 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                    What happens next
                  </p>
                  <ol className="mt-3 space-y-0">
                    {NEXT_STEPS.map((step, index) => (
                      <li key={step} className="flex gap-3">
                        <div className="flex w-4 flex-col items-center">
                          <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                          {index < NEXT_STEPS.length - 1 ? (
                            <span className="my-1 w-px flex-1 bg-neutral-200" />
                          ) : null}
                        </div>
                        <p className="pb-3 text-sm text-neutral-700">{step}</p>
                      </li>
                    ))}
                  </ol>
                </section>
              </form>
                </>
              ) : null}
            </>
          )}
        </div>

        {!successVisitId && availability !== "unavailable" ? (
          <div className="border-t border-neutral-100 bg-white/90 px-5 py-4 backdrop-blur-md sm:px-6">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex flex-1 items-center justify-center rounded-xl border border-neutral-200 bg-white py-3.5 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="site-visit-concierge-form"
                disabled={
                  submitting ||
                  bookingBlocked ||
                  !visitDate ||
                  !visitTime
                }
                className="flex flex-[1.4] items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white shadow-[0_2px_10px_rgba(34,197,94,0.35)] transition hover:brightness-105 disabled:opacity-60"
                style={{ backgroundColor: EMERALD }}
              >
                {submitting ? (
                  <>
                    <span
                      className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                      aria-hidden
                    />
                    Submitting…
                  </>
                ) : (
                  "Request Visit"
                )}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60";

function ProgressIndicator({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <nav aria-label="Booking progress" className="mt-5">
      <ol className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-0">
        {PROGRESS_STEPS.map((step, index) => {
          const done = current > step.id;
          const active = current === step.id;
          return (
            <li key={step.id} className="flex items-center sm:flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    done || active
                      ? "bg-emerald-500 text-white"
                      : "bg-neutral-100 text-neutral-500"
                  }`}
                >
                  {done ? "✓" : step.id}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    active ? "text-neutral-950" : "text-neutral-500"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < PROGRESS_STEPS.length - 1 ? (
                <span
                  className={`mx-2 hidden h-px flex-1 sm:block ${
                    done ? "bg-emerald-300" : "bg-neutral-200"
                  }`}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function AvailabilityCard({
  status,
  nextLabel,
  waitlistJoined,
  onJoinWaitlist,
}: {
  status: AvailabilityStatus;
  nextLabel?: string;
  waitlistJoined: boolean;
  onJoinWaitlist: () => void;
}) {
  if (status === "loading") {
    return (
      <section className="mt-5 rounded-2xl border border-neutral-100 bg-neutral-50/80 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
          Checking
        </p>
        <p className="mt-1 text-sm font-semibold text-neutral-950">
          Checking site visit availability…
        </p>
      </section>
    );
  }

  if (status === "unavailable") {
    return (
      <section className="mt-5 rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-700">
          Unavailable
        </p>
        <p className="mt-1 text-sm font-semibold text-neutral-950">
          Site visits are temporarily unavailable for this property.
        </p>
        <button
          type="button"
          onClick={onJoinWaitlist}
          disabled={waitlistJoined}
          className="mt-3 rounded-full border border-rose-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-70"
        >
          {waitlistJoined ? "You’re on the waitlist" : "Join Waitlist"}
        </button>
      </section>
    );
  }

  if (status === "limited") {
    return (
      <section className="mt-5 rounded-2xl border border-amber-100 bg-amber-50/80 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">
          Limited
        </p>
        <p className="mt-1 text-sm font-semibold text-neutral-950">Limited Slots</p>
        {nextLabel ? (
          <p className="mt-1 text-xs text-neutral-600">Next available · {nextLabel}</p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
        Available
      </p>
      <p className="mt-1 text-sm font-semibold text-neutral-950">✓ Site Visits Available</p>
      {nextLabel ? (
        <p className="mt-1 text-xs text-neutral-600">Next available · {nextLabel}</p>
      ) : null}
    </section>
  );
}

function SuccessPanel({
  referenceId,
  onContinue,
}: {
  referenceId: string;
  onContinue: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-2 py-8 text-center">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full text-2xl text-white shadow-lg"
        style={{ backgroundColor: EMERALD }}
        aria-hidden
      >
        ✓
      </div>
      <h3 className="mt-5 text-2xl font-bold tracking-tight text-neutral-950">
        Request Submitted
      </h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-neutral-600">
        Your AreaIQ Partner will contact you shortly.
      </p>
      <div className="mt-6 rounded-2xl border border-neutral-100 bg-neutral-50 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
          Reference ID
        </p>
        <p className="mt-1 font-mono text-lg font-bold tracking-wide text-neutral-950">
          {referenceId}
        </p>
      </div>
      <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
        <Link
          href="/buyer/site-visits"
          className="inline-flex items-center justify-center rounded-xl py-3.5 text-sm font-semibold text-white shadow-[0_2px_10px_rgba(34,197,94,0.35)]"
          style={{ backgroundColor: EMERALD }}
        >
          View My Visits
        </Link>
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white py-3.5 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
        >
          Continue Browsing
        </button>
      </div>
    </div>
  );
}

function FieldBlock({
  label,
  htmlFor,
  required,
  optional,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-neutral-900">
        {label}
        {required ? <span className="text-emerald-600"> *</span> : null}
        {optional ? (
          <span className="ml-1 text-xs font-medium text-neutral-400">(optional)</span>
        ) : null}
      </label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function OptionRow<T extends string>({
  options,
  value,
  onChange,
  name,
}: {
  options: readonly T[];
  value: T | "";
  onChange: (v: T) => void;
  name: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={name}>
      {options.map((opt) => {
        const selected = value === opt;
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              selected
                ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="truncate font-medium text-neutral-900">{value}</dd>
    </div>
  );
}

function CheckMark() {
  return (
    <span
      className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700"
      aria-hidden
    >
      ✓
    </span>
  );
}
