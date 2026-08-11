"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  fetchSiteVisits,
  formatVisitDate,
  formatVisitTime,
} from "@/lib/buyer/queries";
import {
  fetchVisitContact,
  submitVisitFeedback,
} from "@/lib/crm/queries";
import { SITE_VISIT_BOOKED_EVENT, SITE_VISIT_UPDATED_EVENT } from "@/lib/crm/events";
import {
  comparePastVisits,
  compareUpcomingVisits,
  formatVisitStatusLabel,
  isApprovedVisitStatus,
  isVisitLaterUpcoming,
  isVisitPast,
  isVisitToday,
  isVisitTomorrow,
  isVisitUpcoming,
  matchesVisitStatusFilter,
  VISIT_STATUS_FILTERS,
} from "@/lib/crm/visitWorkflow";
import type { SiteVisitRow } from "@/lib/buyer/types";
import StepProgress from "@/components/premium/StepProgress";
import SiteVisitAssistant from "@/components/buyer/SiteVisitAssistant";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/Button";
import { PageSkeleton } from "@/components/ui/Skeleton";
import EmptyState from "../components/EmptyState";
import { formatPropertyTitle } from "@/lib/properties/formatPropertyTitle";

const STATUS_VARIANT: Record<string, "warning" | "info" | "success" | "error" | "neutral"> = {
  pending_approval: "warning",
  accepted: "info",
  scheduled: "success",
  rescheduled: "info",
  completed: "neutral",
  rejected: "error",
  cancelled: "error",
};

interface ContactInfo {
  ownerContact?: {
    phone?: string | null;
    email?: string | null;
    whatsapp?: string | null;
    name?: string | null;
  } | null;
  visitLocation?: string | null;
  message?: string;
}

function StarRating({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-body">{label}</p>
      <div className="mt-1 flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`text-lg transition ${star <= value ? "text-amber-400" : "text-placeholder"}`}
            aria-label={`${star} stars`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

function VisitFeedbackForm({ visitId, onDone }: { visitId: string; onDone: () => void }) {
  const [notes, setNotes] = useState("");
  const [pros, setPros] = useState("");
  const [cons, setCons] = useState("");
  const [wouldBuy, setWouldBuy] = useState<boolean | null>(null);
  const [constructionRating, setConstructionRating] = useState(3);
  const [parkingRating, setParkingRating] = useState(3);
  const [builderBehaviour, setBuilderBehaviour] = useState(3);
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    const ok = await submitVisitFeedback(visitId, {
      notes: [notes, pros ? `Pros: ${pros}` : "", cons ? `Cons: ${cons}` : ""].filter(Boolean).join("\n"),
      wouldBuy,
      constructionRating,
      parkingRating,
      builderBehaviour,
      additionalComments: comments,
    });
    setSubmitting(false);
    if (ok) onDone();
    else setSubmitError("Couldn't save feedback. Please try again.");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border-t border-neutral-100 pt-5">
      <div>
        <p className="text-sm font-semibold text-heading-secondary">Post-Visit Feedback</p>
        <p className="text-xs text-muted">Your feedback helps AI refine recommendations</p>
      </div>
      {submitError ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
          {submitError}
        </p>
      ) : null}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Overall notes from the visit"
        className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10"
        rows={3}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <textarea value={pros} onChange={(e) => setPros(e.target.value)} placeholder="Pros (what you liked)" className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" rows={2} />
        <textarea value={cons} onChange={(e) => setCons(e.target.value)} placeholder="Cons (concerns)" className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" rows={2} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StarRating value={constructionRating} onChange={setConstructionRating} label="Construction Quality" />
        <StarRating value={parkingRating} onChange={setParkingRating} label="Parking & Access" />
        <StarRating value={builderBehaviour} onChange={setBuilderBehaviour} label="Builder Behaviour" />
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setWouldBuy(true)}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${wouldBuy === true ? "bg-emerald-600 text-white" : "bg-neutral-100 text-body"}`}
        >
          👍 Would Buy
        </button>
        <button
          type="button"
          onClick={() => setWouldBuy(false)}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${wouldBuy === false ? "bg-rose-600 text-white" : "bg-neutral-100 text-body"}`}
        >
          👎 Would Not Buy
        </button>
      </div>
      <input
        value={comments}
        onChange={(e) => setComments(e.target.value)}
        placeholder="Negotiation notes or additional comments"
        className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
      />
      <Button type="submit" loading={submitting} loadingText="Saving feedback...">
        Submit Feedback
      </Button>
    </form>
  );
}

function VisitCard({ visit }: { visit: SiteVisitRow }) {
  const [contact, setContact] = useState<ContactInfo | null>(null);
  const [feedbackDone, setFeedbackDone] = useState(false);
  const [expanded, setExpanded] = useState(visit.status !== "completed");

  useEffect(() => {
    if (isApprovedVisitStatus(visit.status) || visit.status === "completed") {
      fetchVisitContact(visit.id).then(setContact);
    }
  }, [visit.id, visit.status]);

  const checklist = Array.isArray(visit.checklist)
    ? visit.checklist
        .map((item) =>
          typeof item === "string"
            ? item
            : typeof item === "object" && item && "text" in item
              ? String((item as { text: unknown }).text)
              : null,
        )
        .filter((item): item is string => Boolean(item?.trim()))
    : [];
  const isUpcoming = isVisitUpcoming(visit);

  const steps = [
    { label: "Requested", done: true, active: visit.status === "pending_approval" },
    {
      label: "Approved",
      done: isApprovedVisitStatus(visit.status) || visit.status === "completed",
      active: visit.status === "accepted" || visit.status === "scheduled",
    },
    {
      label: "Contact Shared",
      done:
        Boolean(contact?.ownerContact?.phone) ||
        isApprovedVisitStatus(visit.status) ||
        visit.status === "completed",
      active: visit.status === "scheduled" || visit.status === "accepted",
    },
    { label: "Completed", done: visit.status === "completed", active: false },
  ];

  const mapsQuery = encodeURIComponent(
    `${visit.property?.location ?? ""}${visit.property?.city ? `, ${visit.property.city}` : ""}`,
  );
  const calendarDate = (visit.visit_date ?? "").replace(/-/g, "");
  const hasCalendarDate = Boolean(calendarDate);

  return (
    <article className="overflow-hidden rounded-3xl border border-neutral-200/80 bg-white shadow-sm transition hover:shadow-md">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-5 py-4 text-white sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-100">
              {isUpcoming ? "Upcoming Visit" : "Site Visit"}
            </p>
            <h2 className="mt-1 text-lg font-bold">
              {formatPropertyTitle(visit.property?.title) || "Property"}
            </h2>
            <p className="mt-1 text-sm text-emerald-50/90">
              {visit.property?.location}
              {visit.property?.city ? `, ${visit.property.city}` : ""}
            </p>
          </div>
          <Badge variant={STATUS_VARIANT[visit.status] ?? "neutral"} className="bg-white/20 text-white ring-white/30">
            {formatVisitStatusLabel(visit.status)}
          </Badge>
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <StepProgress steps={steps} />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-neutral-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-label">Date</p>
            <p className="mt-1 text-sm font-semibold text-heading-primary">{formatVisitDate(visit.visit_date)}</p>
          </div>
          <div className="rounded-xl bg-neutral-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-label">Time</p>
            <p className="mt-1 text-sm font-semibold text-heading-primary">{formatVisitTime(visit.visit_time)}</p>
          </div>
          {visit.builder_name ? (
            <div className="col-span-2 rounded-xl bg-neutral-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-label">Builder</p>
              <p className="mt-1 text-sm font-semibold text-heading-primary">{visit.builder_name}</p>
            </div>
          ) : null}
        </div>

        {isUpcoming ? (
          <>
            <SiteVisitAssistant visit={visit} />
            <div className="flex flex-wrap gap-2">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-body transition active:scale-[0.98] hover:bg-neutral-50"
              >
                Route Map
              </a>
              {hasCalendarDate ? (
                <a
                  href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Site Visit: ${formatPropertyTitle(visit.property?.title) || "Property"}`)}&dates=${calendarDate}/${calendarDate}&details=${encodeURIComponent(`Visit at ${visit.property?.location ?? ""}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-body transition active:scale-[0.98] hover:bg-neutral-50"
                >
                  Add to Calendar
                </a>
              ) : null}
            </div>
          </>
        ) : null}

        {visit.status === "pending_approval" ? (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            ⏳ Seller approval pending — contact details unlock once your visit is confirmed.
          </p>
        ) : null}

        {contact?.ownerContact?.phone || contact?.ownerContact?.email ? (
          <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <p className="font-semibold">Seller Contact (Unlocked)</p>
            {contact.ownerContact.name ? <p>{contact.ownerContact.name}</p> : null}
            {contact.ownerContact.phone ? (
              <p>
                📞{" "}
                <a href={`tel:${contact.ownerContact.phone}`} className="font-medium underline">
                  {contact.ownerContact.phone}
                </a>
              </p>
            ) : null}
            {contact.ownerContact.whatsapp ? (
              <p>
                <a
                  href={`https://wa.me/${contact.ownerContact.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline"
                >
                  WhatsApp
                </a>
              </p>
            ) : null}
            {contact.visitLocation ? (
              <p className="mt-1 text-xs">📍 {contact.visitLocation}</p>
            ) : null}
          </div>
        ) : contact?.message ? (
          <p className="text-sm text-muted">{contact.message}</p>
        ) : null}

        {checklist.length > 0 ? (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
            <p className="text-sm font-semibold text-emerald-900">🤖 AI Visit Checklist</p>
            <ul className="mt-2 space-y-1.5">
              {checklist.map((item, index) => (
                <li key={`${item}-${index}`} className="flex items-center gap-2 text-sm text-body">
                  <span className="text-emerald-500" aria-hidden>☐</span> {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {(isApprovedVisitStatus(visit.status) || visit.status === "completed") && !feedbackDone ? (
          <>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
            >
              {expanded ? "Hide feedback form" : "Share visit feedback →"}
            </button>
            {expanded ? <VisitFeedbackForm visitId={visit.id} onDone={() => setFeedbackDone(true)} /> : null}
          </>
        ) : null}

        {visit.property_id ? (
          <Link
            href={`/property/${visit.property_id}`}
            className="inline-block text-sm font-semibold text-emerald-600 hover:text-emerald-700"
          >
            View property details →
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export default function SiteVisitsPage() {
  const { user } = useAuth();
  const [visits, setVisits] = useState<SiteVisitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const load = () => {
      fetchSiteVisits(user.id)
        .then((data) => {
          setVisits(Array.isArray(data) ? data : []);
          setLoading(false);
          setLoadError(null);
        })
        .catch(() => {
          setVisits([]);
          setLoading(false);
          setLoadError("Unable to load site visits. Tap Retry or refresh the page.");
        });
    };

    load();

    const onChange = () => load();
    window.addEventListener(SITE_VISIT_BOOKED_EVENT, onChange);
    window.addEventListener(SITE_VISIT_UPDATED_EVENT, onChange);
    const poll = window.setInterval(load, 20_000);
    return () => {
      window.removeEventListener(SITE_VISIT_BOOKED_EVENT, onChange);
      window.removeEventListener(SITE_VISIT_UPDATED_EVENT, onChange);
      window.clearInterval(poll);
    };
  }, [user]);

  const filtered = visits.filter((v) => matchesVisitStatusFilter(v.status, statusFilter));
  const todayVisits = filtered
    .filter((v) => isVisitToday(v))
    .sort(compareUpcomingVisits);
  const tomorrowVisits = filtered
    .filter((v) => isVisitTomorrow(v))
    .sort(compareUpcomingVisits);
  const laterUpcoming = filtered
    .filter((v) => isVisitLaterUpcoming(v))
    .sort(compareUpcomingVisits);
  const past = filtered
    .filter((v) => isVisitPast(v))
    .sort(comparePastVisits);
  const hasAny =
    todayVisits.length + tomorrowVisits.length + laterUpcoming.length + past.length > 0;

  if (loading) return <PageSkeleton rows={3} />;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        eyebrow="Signature Feature"
        title="Site Visits"
        description="Track approval, prepare with AI checklists, and share feedback after your visit"
        action={
          <ButtonLink href="/properties" variant="secondary">
            Book New Visit
          </ButtonLink>
        }
      />

      {loadError ? (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {loadError}
        </div>
      ) : null}

      {visits.length > 0 ? (
        <div className="-mx-1 flex gap-2 overflow-x-auto scroll-touch px-1 pb-1">
          {VISIT_STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={`min-h-12 shrink-0 rounded-full border px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] ${
                statusFilter === f.value
                  ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                  : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      ) : null}

      {visits.length === 0 ? (
        <EmptyState
          icon="📅"
          title="No site visits booked"
          description="Book a site visit from any property page. Contact details unlock after seller approval."
          tips={[
            "Choose a convenient date and time on the property page",
            "Get an AI-generated checklist before your visit",
            "Share feedback after visiting to improve recommendations",
          ]}
        />
      ) : filtered.length === 0 || !hasAny ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-white px-6 py-10 text-center">
          <p className="text-base text-muted">No visits match this filter.</p>
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white"
          >
            Clear filter
          </button>
        </div>
      ) : (
        <>
          {todayVisits.length > 0 ? (
            <section>
              <h2 className="mb-4 text-xl font-bold text-heading-primary">
                Today ({todayVisits.length})
              </h2>
              <div className="space-y-4">
                {todayVisits.map((visit) => (
                  <VisitCard key={visit.id} visit={visit} />
                ))}
              </div>
            </section>
          ) : null}
          {tomorrowVisits.length > 0 ? (
            <section>
              <h2 className="mb-4 text-xl font-bold text-heading-primary">
                Tomorrow ({tomorrowVisits.length})
              </h2>
              <div className="space-y-4">
                {tomorrowVisits.map((visit) => (
                  <VisitCard key={visit.id} visit={visit} />
                ))}
              </div>
            </section>
          ) : null}
          {laterUpcoming.length > 0 ? (
            <section>
              <h2 className="mb-4 text-xl font-bold text-heading-primary">
                Upcoming ({laterUpcoming.length})
              </h2>
              <div className="space-y-4">
                {laterUpcoming.map((visit) => (
                  <VisitCard key={visit.id} visit={visit} />
                ))}
              </div>
            </section>
          ) : null}
          {past.length > 0 ? (
            <section>
              <h2 className="mb-4 text-xl font-bold text-heading-primary">
                History ({past.length})
              </h2>
              <p className="mb-3 text-sm text-muted">
                Completed, cancelled, rejected, and past-dated visits.
              </p>
              <div className="space-y-4">
                {past.map((visit) => (
                  <VisitCard key={visit.id} visit={visit} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
