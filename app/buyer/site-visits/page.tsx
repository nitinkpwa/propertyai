"use client";

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
import { SITE_VISIT_BOOKED_EVENT } from "@/lib/crm/events";
import { formatVisitStatusLabel } from "@/lib/crm/visitWorkflow";
import type { SiteVisitRow } from "@/lib/buyer/types";
import StepProgress from "@/components/premium/StepProgress";
import EmptyState from "../components/EmptyState";

const STATUS_STYLES: Record<string, string> = {
  pending_approval: "bg-amber-50 text-amber-700 ring-amber-200/80",
  accepted: "bg-blue-50 text-blue-700 ring-blue-200/80",
  scheduled: "bg-emerald-50 text-emerald-700 ring-emerald-200/80",
  completed: "bg-neutral-100 text-neutral-700 ring-neutral-200/80",
  rejected: "bg-rose-50 text-rose-700 ring-rose-200/80",
  cancelled: "bg-rose-50 text-rose-700 ring-rose-200/80",
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

function VisitFeedbackForm({ visitId, onDone }: { visitId: string; onDone: () => void }) {
  const [notes, setNotes] = useState("");
  const [wouldBuy, setWouldBuy] = useState<boolean | null>(null);
  const [constructionRating, setConstructionRating] = useState(3);
  const [parkingRating, setParkingRating] = useState(3);
  const [builderBehaviour, setBuilderBehaviour] = useState(3);
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const ok = await submitVisitFeedback(visitId, {
      notes,
      wouldBuy,
      constructionRating,
      parkingRating,
      builderBehaviour,
      additionalComments: comments,
    });
    setSubmitting(false);
    if (ok) onDone();
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 border-t border-neutral-100 pt-4">
      <p className="text-sm font-semibold text-neutral-800">Post-visit feedback</p>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Your notes from the visit"
        className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
        rows={3}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="text-xs text-neutral-600">
          Construction (1–5)
          <input type="number" min={1} max={5} value={constructionRating} onChange={(e) => setConstructionRating(Number(e.target.value))} className="mt-1 w-full rounded-lg border px-2 py-1 text-sm" />
        </label>
        <label className="text-xs text-neutral-600">
          Parking (1–5)
          <input type="number" min={1} max={5} value={parkingRating} onChange={(e) => setParkingRating(Number(e.target.value))} className="mt-1 w-full rounded-lg border px-2 py-1 text-sm" />
        </label>
        <label className="text-xs text-neutral-600">
          Builder behaviour (1–5)
          <input type="number" min={1} max={5} value={builderBehaviour} onChange={(e) => setBuilderBehaviour(Number(e.target.value))} className="mt-1 w-full rounded-lg border px-2 py-1 text-sm" />
        </label>
      </div>
      <div className="flex gap-3 text-sm">
        <label className="flex items-center gap-2">
          <input type="radio" checked={wouldBuy === true} onChange={() => setWouldBuy(true)} />
          Would buy
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" checked={wouldBuy === false} onChange={() => setWouldBuy(false)} />
          Would not buy
        </label>
      </div>
      <input
        value={comments}
        onChange={(e) => setComments(e.target.value)}
        placeholder="Additional comments"
        className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={submitting}
        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {submitting ? "Saving..." : "Submit feedback"}
      </button>
    </form>
  );
}

function VisitCard({ visit }: { visit: SiteVisitRow }) {
  const [contact, setContact] = useState<ContactInfo | null>(null);
  const [feedbackDone, setFeedbackDone] = useState(false);

  useEffect(() => {
    if (["scheduled", "accepted", "completed"].includes(visit.status)) {
      fetchVisitContact(visit.id).then(setContact);
    }
  }, [visit.id, visit.status]);

  const checklist = Array.isArray(visit.checklist) ? visit.checklist : [];

  const steps = [
    { label: "Requested", done: true, active: visit.status === "pending_approval" },
    {
      label: "Approved",
      done: ["accepted", "scheduled", "completed"].includes(visit.status),
      active: visit.status === "accepted",
    },
    {
      label: "Contact Shared",
      done: Boolean(contact?.ownerContact?.phone) || ["scheduled", "completed"].includes(visit.status),
      active: visit.status === "scheduled",
    },
    { label: "Completed", done: visit.status === "completed", active: false },
  ];

  return (
    <article className="overflow-hidden rounded-3xl border border-neutral-200/80 bg-white shadow-sm">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-5 py-4 text-white sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-100">
              Site Visit Tracking
            </p>
            <h2 className="mt-1 text-lg font-bold">{visit.property?.title ?? "Property"}</h2>
            <p className="mt-1 text-sm text-emerald-50/90">
              {visit.property?.location}
              {visit.property?.city ? `, ${visit.property.city}` : ""}
            </p>
          </div>
          <span
            className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLES[visit.status] ?? "bg-white/20 text-white"}`}
          >
            {formatVisitStatusLabel(visit.status)}
          </span>
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <StepProgress steps={steps} />

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-neutral-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Visit Date</p>
            <p className="mt-1 text-sm font-semibold text-neutral-900">{formatVisitDate(visit.visit_date)}</p>
          </div>
          <div className="rounded-xl bg-neutral-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Visit Time</p>
            <p className="mt-1 text-sm font-semibold text-neutral-900">{formatVisitTime(visit.visit_time)}</p>
          </div>
        </div>

        {visit.status === "pending_approval" ? (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Seller approval pending — contact details unlock once your visit is confirmed.
          </p>
        ) : null}

      {contact?.ownerContact?.phone || contact?.ownerContact?.email ? (
        <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <p className="font-semibold">Seller contact (unlocked)</p>
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
        <p className="mt-4 text-sm text-neutral-500">{contact.message}</p>
      ) : null}

      {checklist.length > 0 ? (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
          <p className="text-sm font-semibold text-emerald-900">🤖 AI Visit Assistant — Checklist</p>
          <ul className="mt-2 space-y-1">
            {checklist.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-neutral-600">
                <span className="text-emerald-500">☐</span> {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {["scheduled", "accepted", "completed"].includes(visit.status) && !feedbackDone ? (
        <VisitFeedbackForm visitId={visit.id} onDone={() => setFeedbackDone(true)} />
      ) : null}
      </div>
    </article>
  );
}

export default function SiteVisitsPage() {
  const { user } = useAuth();
  const [visits, setVisits] = useState<SiteVisitRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const load = () => {
      fetchSiteVisits(user.id).then((data) => {
        setVisits(data);
        setLoading(false);
      });
    };

    load();

    const onBooked = () => load();
    window.addEventListener(SITE_VISIT_BOOKED_EVENT, onBooked);
    return () => window.removeEventListener(SITE_VISIT_BOOKED_EVENT, onBooked);
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
          Site Visits
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Track approval status, checklist, and seller contact after acceptance
        </p>
      </div>

      {visits.length === 0 ? (
        <EmptyState
          icon="📅"
          title="No site visits booked"
          description="Book a site visit from any property page. Contact details unlock after approval."
        />
      ) : (
        <div className="space-y-4">
          {visits.map((visit) => (
            <VisitCard key={visit.id} visit={visit} />
          ))}
        </div>
      )}
    </div>
  );
}
