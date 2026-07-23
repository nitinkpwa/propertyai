"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ConnectPartner, ConnectPartnerStatus } from "@/lib/connect/partners/types";
import { CONNECT_CITIES } from "@/lib/connect/constants";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

const FIELD =
  "h-12 w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-0 text-sm leading-none text-input outline-none transition placeholder:text-placeholder focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-muted";

const SELECT_FIELD = `${FIELD} appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10`;
const SELECT_CHEVRON =
  "bg-[url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236b7280%22 stroke-width=%222%22%3E%3Cpath d=%22M6 9l6 6 6-6%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/%3E%3C/svg%3E')]";

const LABEL = "mb-1.5 block text-sm font-medium text-label";

type FormState = {
  companyName: string;
  managerName: string;
  phone: string;
  email: string;
  password: string;
  address: string;
  city: string;
  gst: string;
  rera: string;
  logo: string;
  notes: string;
  status: ConnectPartnerStatus;
};

const EMPTY: FormState = {
  companyName: "",
  managerName: "",
  phone: "",
  email: "",
  password: "",
  address: "",
  city: "",
  gst: "",
  rera: "",
  logo: "",
  notes: "",
  status: "pending",
};

function fromPartner(p: ConnectPartner): FormState {
  return {
    companyName: p.company_name ?? "",
    managerName: p.manager_name ?? "",
    phone: p.phone ?? "",
    email: p.email ?? "",
    password: "",
    address: p.address ?? "",
    city: p.city ?? "",
    gst: p.gst ?? "",
    rera: p.rera ?? "",
    logo: p.logo ?? "",
    notes: p.notes ?? "",
    status: p.status ?? "pending",
  };
}

export interface PartnerFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  partner?: ConnectPartner | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Add / Edit Builder (Connect Partner) modal — sticky chrome, 2-col grid, no layout drift.
 */
export default function PartnerFormModal({
  open,
  mode,
  partner,
  onClose,
  onSaved,
}: PartnerFormModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(mode === "edit" && partner ? fromPartner(partner) : EMPTY);
  }, [open, mode, partner]);

  useEffect(() => {
    if (!open) return;

    previousFocus.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;

      const nodes = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);

      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>("input, select, button")?.focus();
    });

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      previousFocus.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const set =
    (key: keyof FormState) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "create") {
        const res = await fetch("/api/admin/connect/partners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Failed to create builder");
          return;
        }
      } else if (partner) {
        const { password: _pw, ...rest } = form;
        const res = await fetch(`/api/admin/connect/partners/${partner.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rest),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Failed to update builder");
          return;
        }
      }
      onSaved();
      onClose();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const title = mode === "create" ? "Add Builder" : "Edit Builder";
  const subtitle =
    mode === "create"
      ? "Create a Connect partner account with login credentials."
      : "Update builder profile details. Password is unchanged.";

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-neutral-950/45 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex w-[90vw] max-w-[900px] max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-2xl"
      >
        {/* Sticky header */}
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-neutral-100 px-6 py-5">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-2xl font-bold tracking-tight text-heading-primary"
            >
              {title}
            </h2>
            <p className="mt-1 text-xs text-muted">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-neutral-100 hover:text-heading-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {/* Scrollable body */}
        <form
          id="partner-builder-form"
          onSubmit={handleSubmit}
          className="admin-modal-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-6 py-6"
        >
          {error ? (
            <div
              className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
              role="alert"
            >
              {error}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
            <Field label="Builder Name" htmlFor="builder-manager">
              <input
                id="builder-manager"
                className={FIELD}
                value={form.managerName}
                onChange={set("managerName")}
                placeholder="Full name"
                required
                autoComplete="name"
              />
            </Field>

            <Field label="Company" htmlFor="builder-company">
              <input
                id="builder-company"
                className={FIELD}
                value={form.companyName}
                onChange={set("companyName")}
                placeholder="Company / brand name"
                required
                autoComplete="organization"
              />
            </Field>

            <Field label="City" htmlFor="builder-city">
              <select
                id="builder-city"
                className={`${SELECT_FIELD} ${SELECT_CHEVRON}`}
                value={form.city}
                onChange={set("city")}
              >
                <option value="">Select city</option>
                {CONNECT_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Status" htmlFor="builder-status">
              <select
                id="builder-status"
                className={`${SELECT_FIELD} ${SELECT_CHEVRON}`}
                value={form.status}
                onChange={set("status")}
              >
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="archived">Archived</option>
              </select>
            </Field>

            <Field label="GST" htmlFor="builder-gst">
              <input
                id="builder-gst"
                className={FIELD}
                value={form.gst}
                onChange={set("gst")}
                placeholder="GSTIN"
              />
            </Field>

            <Field label="RERA" htmlFor="builder-rera">
              <input
                id="builder-rera"
                className={FIELD}
                value={form.rera}
                onChange={set("rera")}
                placeholder="RERA registration"
              />
            </Field>

            <Field label="Logo URL" htmlFor="builder-logo">
              <input
                id="builder-logo"
                className={FIELD}
                value={form.logo}
                onChange={set("logo")}
                placeholder="https://"
                type="text"
                inputMode="url"
              />
            </Field>

            <Field label="Website / Address" htmlFor="builder-address">
              <input
                id="builder-address"
                className={FIELD}
                value={form.address}
                onChange={set("address")}
                placeholder="Office address or website"
                autoComplete="street-address"
              />
            </Field>

            <Field label="Phone" htmlFor="builder-phone">
              <input
                id="builder-phone"
                className={FIELD}
                type="tel"
                value={form.phone}
                onChange={set("phone")}
                placeholder="+91…"
                required
                autoComplete="tel"
              />
            </Field>

            <Field label="Email" htmlFor="builder-email">
              <input
                id="builder-email"
                className={FIELD}
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="name@company.com"
                required
                autoComplete="email"
              />
            </Field>

            {mode === "create" ? (
              <Field
                label="Password"
                htmlFor="builder-password"
                className="sm:col-span-2"
                hint="Initial login password for the Connect partner portal."
              >
                <input
                  id="builder-password"
                  className={FIELD}
                  type="password"
                  value={form.password}
                  onChange={set("password")}
                  placeholder="Min. 8 characters"
                  required
                  autoComplete="new-password"
                  minLength={8}
                />
              </Field>
            ) : null}

            <Field
              label="Notes"
              htmlFor="builder-notes"
              className="sm:col-span-2"
              hint="Internal notes — not shown to buyers."
            >
              <textarea
                id="builder-notes"
                value={form.notes}
                onChange={set("notes")}
                rows={3}
                placeholder="Optional notes…"
                className="min-h-[96px] w-full resize-y rounded-xl border border-neutral-200 bg-white px-3.5 py-3 text-sm text-input outline-none transition placeholder:text-placeholder focus:border-brand focus:ring-2 focus:ring-brand/15"
              />
            </Field>
          </div>
        </form>

        {/* Sticky footer */}
        <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-neutral-100 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-12 items-center justify-center rounded-xl border border-neutral-200 bg-white px-5 text-sm font-semibold text-body transition hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="partner-builder-form"
            disabled={loading}
            className="inline-flex h-12 min-w-[140px] items-center justify-center rounded-xl bg-brand px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Saving…" : "Save Builder"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
  className = "",
  hint,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
  hint?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={htmlFor} className={LABEL}>
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
