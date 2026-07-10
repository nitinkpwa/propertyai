"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  devLogSiteVisit,
  mapSiteVisitError,
  PROPERTY_UUID_RE,
} from "@/lib/crm/siteVisitErrors";
import { useProgressiveProfileOptional } from "@/components/buyer/ProgressiveProfileProvider";
import { SITE_VISIT_BOOKED_EVENT } from "@/lib/crm/events";
import { EMERALD } from "./shared";

const VISIT_TIMES = ["10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"];

interface SiteVisitModalProps {
  propertyId: string;
  propertyName: string;
  builderName?: string;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

function formatTimeLabel(t: string): string {
  const hour = Number(t.slice(0, 2));
  const ampm = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  return `${h}:${t.slice(3)} ${ampm}`;
}

export default function SiteVisitModal({
  propertyId,
  propertyName,
  builderName,
  open,
  onClose,
  onSuccess,
}: SiteVisitModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const profilePrompt = useProgressiveProfileOptional();
  const [visitDate, setVisitDate] = useState("");
  const [visitTime, setVisitTime] = useState("10:00");
  const [purpose, setPurpose] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setVisitDate("");
    setVisitTime("10:00");
    setPurpose("");
    setError(null);
    setSubmitting(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    devLogSiteVisit("Modal opened", { propertyId, propertyName });
  }, [open, propertyId, propertyName]);

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open, resetForm]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!open && !toast) return null;

  const minDate = new Date().toISOString().slice(0, 10);
  const normalizedId = propertyId?.trim() ?? "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    if (!normalizedId || !PROPERTY_UUID_RE.test(normalizedId)) {
      setError("Unable to identify this property. Please refresh the page.");
      devLogSiteVisit("Invalid propertyId in modal", { propertyId: normalizedId });
      return;
    }

    if (!visitDate) {
      setError("Please select a visit date.");
      return;
    }

    if (visitDate < minDate) {
      setError("Please choose a date today or in the future.");
      return;
    }

    if (!visitTime) {
      setError("Please select a visit time.");
      return;
    }

    setSubmitting(true);

    const payload = {
      propertyId: normalizedId,
      visitDate,
      visitTime,
      purpose: purpose.trim() || undefined,
      builderName,
    };

    devLogSiteVisit("Submitting booking", {
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

      devLogSiteVisit("API response", {
        status: res.status,
        data,
        propertyId: normalizedId,
      });

      if (!res.ok) {
        const mapped = mapSiteVisitError(res.status, data);
        setError(mapped.message);
        setSubmitting(false);
        return;
      }

      window.dispatchEvent(
        new CustomEvent(SITE_VISIT_BOOKED_EVENT, {
          detail: { visitId: data.visitId, propertyId: normalizedId },
        }),
      );

      onSuccess?.();
      onClose();
      setToast("Site visit request sent successfully.");
      setSubmitting(false);
      void profilePrompt?.promptIfNeeded("site_visit");
    } catch (cause) {
      devLogSiteVisit("Network error", { cause, propertyId: normalizedId });
      const mapped = mapSiteVisitError(0, null, cause);
      setError(mapped.message);
      setSubmitting(false);
    }
  };

  return (
    <>
      {toast ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-[110] -translate-x-1/2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-medium text-white shadow-lg"
        >
          {toast}
        </div>
      ) : null}

      {open ? (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <button
          type="button"
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={submitting ? undefined : onClose}
          aria-label="Close"
        />

        <div
          className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl"
          role="dialog"
          aria-labelledby="site-visit-title"
        >
          <h3 id="site-visit-title" className="text-lg font-bold text-input">
            Book Site Visit
          </h3>
          <p className="mt-1 text-sm font-medium text-body">{propertyName}</p>
          <p className="mt-2 text-xs text-muted">
            Seller contact details are shared only after your request is approved.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="visit-date" className="block text-sm font-medium text-body">
                Visit Date <span className="text-red-500">*</span>
              </label>
              <input
                id="visit-date"
                type="date"
                min={minDate}
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                required
                disabled={submitting}
                className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3.5 py-3 text-sm text-input outline-none transition-colors placeholder:text-placeholder focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
              />
            </div>

            <div>
              <label htmlFor="visit-time" className="block text-sm font-medium text-body">
                Visit Time <span className="text-red-500">*</span>
              </label>
              <select
                id="visit-time"
                value={visitTime}
                onChange={(e) => setVisitTime(e.target.value)}
                required
                disabled={submitting}
                className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3.5 py-3 text-sm text-input outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
              >
                {VISIT_TIMES.map((t) => (
                  <option key={t} value={t}>
                    {formatTimeLabel(t)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="visit-purpose" className="block text-sm font-medium text-body">
                Purpose <span className="text-placeholder">(optional)</span>
              </label>
              <input
                id="visit-purpose"
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g. Investment, self-use, comparison"
                disabled={submitting}
                className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3.5 py-3 text-sm text-input outline-none transition-colors placeholder:text-placeholder focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
              />
            </div>

            {error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex flex-1 items-center justify-center rounded-xl border border-gray-300 bg-white py-3 text-sm font-semibold text-heading-secondary transition-colors hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !visitDate || !visitTime}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                style={{ backgroundColor: EMERALD }}
              >
                {submitting ? (
                  <>
                    <span
                      className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                      aria-hidden
                    />
                    Booking…
                  </>
                ) : (
                  "Confirm Visit"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      ) : null}
    </>
  );
}
