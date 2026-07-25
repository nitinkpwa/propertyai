"use client";

import { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOverlay } from "@/lib/layout/overlay";
import { useAuth } from "@/lib/auth/AuthProvider";
import SelectableChip from "@/app/components/filters/SelectableChip";
import SearchableMultiSelect from "@/components/buyer/SearchableMultiSelect";
import type { ProfileCompletenessResult } from "@/lib/buyer/profileCompleteness";
import {
  BUYING_PURPOSE_OPTIONS,
  BUYING_TIMELINE_OPTIONS,
  LOAN_STATUS_OPTIONS,
  PREFERRED_AREA_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
  labelForLoan,
  labelForPurpose,
  labelForTimeline,
} from "@/lib/buyer/profileFields";
import { patchBuyerProfile } from "@/lib/buyer/profilePatch";
import { formatBudgetRange } from "@/lib/properties/pricingDisplay";
import type { Profile } from "@/lib/supabase";

const TOTAL_STEPS = 6;

const STEPS = [
  {
    title: "Buying Purpose & Timeline",
    description: "Tell us why you're buying and when you plan to move forward.",
  },
  {
    title: "Budget & Financing",
    description: "Share your budget range and how you plan to fund the purchase.",
  },
  {
    title: "Property Preferences",
    description: "Select property types and locations you're interested in.",
  },
  {
    title: "About You",
    description: "Help us understand your household and where you live now.",
  },
  {
    title: "Additional Notes",
    description: "Anything else that would help us find the right property for you.",
  },
  {
    title: "Review Your Profile",
    description: "Confirm everything looks good before finishing.",
  },
] as const;

const CITY_OPTIONS = [
  "Chandigarh",
  "Mohali",
  "Panchkula",
  "Zirakpur",
  "Kharar",
  "New Chandigarh",
  "Aerocity",
  "Derabassi",
  "Delhi",
  "Gurgaon",
  "Other",
] as const;

interface Props {
  completeness: ProfileCompletenessResult;
  onClose: (saved: boolean) => void;
  onSaved: () => Promise<void>;
}

function parseBudgetInput(value: string): number | null {
  const cleaned = value.replace(/[^0-9]/g, "");
  if (!cleaned) return null;
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function formatBudgetInput(value: number | null | undefined): string {
  if (value == null) return "";
  return value.toLocaleString("en-IN");
}

function formatBudgetDisplay(min?: number | null, max?: number | null): string {
  if (min == null && max == null) return "Not set";
  return formatBudgetRange(min, max) || "Not set";
}

function getInitialStep(profile: Partial<Profile> | null | undefined): number {
  if (!profile) return 1;
  if (!profile.buying_purpose && !profile.buying_timeline) return 1;
  if (profile.budget_min == null && profile.budget_max == null && !profile.loan_status) return 2;
  if (
    (profile.preferred_property_types?.length ?? 0) === 0 &&
    (profile.preferred_locations?.length ?? 0) === 0
  ) {
    return 3;
  }
  if (!profile.occupation && !profile.family_size && !profile.city) return 4;
  if (!profile.buyer_notes?.trim()) return 5;
  return 6;
}

function stepProgressPercent(step: number): number {
  return Math.round((step / TOTAL_STEPS) * 100);
}

export default function ProfileCompletionModal({ completeness, onClose, onSaved }: Props) {
  const { zClassName } = useOverlay("modal", true, () => onClose(false));
  const { user, profile } = useAuth();
  const [step, setStep] = useState(() => getInitialStep(profile));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [direction, setDirection] = useState(1);

  const [purpose, setPurpose] = useState(profile?.buying_purpose ?? "");
  const [timeline, setTimeline] = useState(profile?.buying_timeline ?? "");
  const [budgetMin, setBudgetMin] = useState(formatBudgetInput(profile?.budget_min));
  const [budgetMax, setBudgetMax] = useState(formatBudgetInput(profile?.budget_max));
  const [loan, setLoan] = useState(profile?.loan_status ?? "");
  const [types, setTypes] = useState<string[]>(profile?.preferred_property_types ?? []);
  const [areas, setAreas] = useState<string[]>(profile?.preferred_locations ?? []);
  const [occupation, setOccupation] = useState(profile?.occupation ?? "");
  const [familySize, setFamilySize] = useState(profile?.family_size?.toString() ?? "");
  const [currentCity, setCurrentCity] = useState(profile?.city ?? "");
  const [notes, setNotes] = useState(profile?.buyer_notes ?? "");

  const progressPercent = stepProgressPercent(step);

  const toggleType = (value: string) => {
    setTypes((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    );
  };

  const buildPatchForStep = useCallback(
    (currentStep: number): Record<string, unknown> => {
      switch (currentStep) {
        case 1: {
          const patch: Record<string, unknown> = {};
          if (purpose) patch.buying_purpose = purpose;
          if (timeline) patch.buying_timeline = timeline;
          return patch;
        }
        case 2: {
          const patch: Record<string, unknown> = {};
          const min = parseBudgetInput(budgetMin);
          const max = parseBudgetInput(budgetMax);
          if (min != null) patch.budget_min = min;
          if (max != null) patch.budget_max = max;
          if (loan) patch.loan_status = loan;
          return patch;
        }
        case 3: {
          const patch: Record<string, unknown> = {};
          if (types.length > 0) patch.preferred_property_types = types;
          if (areas.length > 0) patch.preferred_locations = areas;
          return patch;
        }
        case 4: {
          const patch: Record<string, unknown> = {};
          if (occupation.trim()) patch.occupation = occupation.trim();
          const n = parseInt(familySize, 10);
          if (n > 0) patch.family_size = n;
          if (currentCity.trim()) patch.city = currentCity.trim();
          return patch;
        }
        case 5:
          return { buyer_notes: notes.trim() || null };
        default:
          return {};
      }
    },
    [purpose, timeline, budgetMin, budgetMax, loan, types, areas, occupation, familySize, currentCity, notes],
  );

  const validateStep = (currentStep: number): string | null => {
    if (currentStep === 2) {
      const min = parseBudgetInput(budgetMin);
      const max = parseBudgetInput(budgetMax);
      if (min != null && max != null && min > max) {
        return "Minimum budget cannot exceed maximum budget.";
      }
    }
    if (currentStep === 4 && familySize.trim()) {
      const n = parseInt(familySize, 10);
      if (!n || n < 1 || n > 20) {
        return "Family size must be between 1 and 20.";
      }
    }
    return null;
  };

  const persistStep = async (currentStep: number): Promise<boolean> => {
    if (!user) return false;
    const patch = buildPatchForStep(currentStep);
    if (Object.keys(patch).length === 0) return true;

    setSaving(true);
    setError(null);
    const result = await patchBuyerProfile(user.id, patch);
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return false;
    }
    await onSaved();
    return true;
  };

  const goToStep = (nextStep: number, dir: number) => {
    setDirection(dir);
    setError(null);
    setStep(nextStep);
  };

  const handleNext = async () => {
    const validationError = validateStep(step);
    if (validationError) {
      setError(validationError);
      return;
    }
    const ok = await persistStep(step);
    if (!ok) return;
    if (step < TOTAL_STEPS) goToStep(step + 1, 1);
  };

  const handleSkip = async () => {
    setError(null);
    const ok = await persistStep(step);
    if (!ok) return;
    if (step < TOTAL_STEPS) goToStep(step + 1, 1);
  };

  const handlePrevious = () => {
    if (step > 1) goToStep(step - 1, -1);
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);

    const patch: Record<string, unknown> = {};
    for (let i = 1; i <= 5; i++) {
      Object.assign(patch, buildPatchForStep(i));
    }

    const result = await patchBuyerProfile(user.id, patch);
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    await onSaved();
    onClose(true);
  };

  const propertyTypeLabels = useMemo(
    () =>
      types
        .map((v) => PROPERTY_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? v)
        .join(", ") || "Not set",
    [types],
  );

  const reviewSections = [
    {
      step: 1,
      title: "Purpose & Timeline",
      items: [
        { label: "Buying Purpose", value: purpose ? labelForPurpose(purpose) : "Not set" },
        { label: "Timeline", value: timeline ? labelForTimeline(timeline) : "Not set" },
      ],
    },
    {
      step: 2,
      title: "Budget & Financing",
      items: [
        {
          label: "Budget",
          value: formatBudgetDisplay(parseBudgetInput(budgetMin), parseBudgetInput(budgetMax)),
        },
        { label: "Loan Status", value: loan ? labelForLoan(loan) : "Not set" },
      ],
    },
    {
      step: 3,
      title: "Property Preferences",
      items: [
        { label: "Property Types", value: propertyTypeLabels },
        { label: "Locations", value: areas.length > 0 ? areas.join(", ") : "Not set" },
      ],
    },
    {
      step: 4,
      title: "About You",
      items: [
        { label: "Occupation", value: occupation.trim() || "Not set" },
        { label: "Family Size", value: familySize.trim() || "Not set" },
        { label: "Current City", value: currentCity.trim() || "Not set" },
      ],
    },
    {
      step: 5,
      title: "Additional Notes",
      items: [{ label: "Notes", value: notes.trim() || "None" }],
    },
  ];

  const inputClass =
    "w-full rounded-xl border border-neutral-200 bg-white px-4 py-3.5 text-base text-heading-primary shadow-sm outline-none transition-all placeholder:text-placeholder focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10";
  const labelClass = "mb-2 block text-base font-medium leading-snug text-heading-secondary";

  return (
    <div className={`fixed inset-0 ${zClassName} flex items-center justify-center p-4 sm:p-6`}>
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-neutral-900/50 backdrop-blur-[2px]"
        onClick={() => onClose(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-wizard-title"
        className="relative flex max-h-[92vh] w-full max-w-[780px] flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.18)]"
      >
        {/* Header */}
        <div className="border-b border-neutral-100 px-8 pb-6 pt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
            AreaIQ
          </p>
          <h2 id="profile-wizard-title" className="mt-2 text-2xl font-bold tracking-tight text-heading-primary">
            Complete Your Buyer Profile
          </h2>
          <p className="mt-2 max-w-xl text-base leading-relaxed text-muted">
            Help us recommend better properties and match you with the right opportunities.
          </p>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-sm font-medium text-body">
              <span className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                Step {step} of {TOTAL_STEPS}
              </span>
              <span className="tabular-nums text-emerald-700">{progressPercent}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600"
                initial={false}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            {completeness.percent > 0 && completeness.percent < 100 ? (
              <p className="mt-1.5 text-xs text-muted">
                Profile saved: {completeness.percent}% complete overall
              </p>
            ) : null}
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-8 py-7">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-heading-primary">{STEPS[step - 1].title}</h3>
            <p className="mt-1.5 text-base leading-relaxed text-muted">
              {STEPS[step - 1].description}
            </p>
          </div>

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              initial={{ opacity: 0, x: direction * 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -24 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="space-y-6"
            >
              {step === 1 ? (
                <>
                  <div>
                    <p className={labelClass}>Buying Purpose</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
                      {BUYING_PURPOSE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setPurpose(option.value)}
                          className={`flex items-center gap-3 rounded-2xl border px-5 py-4 text-left text-base font-medium transition-all ${
                            purpose === option.value
                              ? "border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-200"
                              : "border-neutral-200 text-body hover:border-emerald-200 hover:bg-neutral-50"
                          }`}
                        >
                          <span className="text-xl">{option.icon}</span>
                          <span>{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="timeline" className={labelClass}>
                      Timeline
                    </label>
                    <select
                      id="timeline"
                      value={timeline}
                      onChange={(e) => setTimeline(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select timeline…</option>
                      {BUYING_TIMELINE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : null}

              {step === 2 ? (
                <>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="budget-min" className={labelClass}>
                        Minimum Budget
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-muted">
                          ₹
                        </span>
                        <input
                          id="budget-min"
                          type="text"
                          inputMode="numeric"
                          value={budgetMin}
                          onChange={(e) => setBudgetMin(e.target.value.replace(/[^0-9,]/g, ""))}
                          placeholder="50,00,000"
                          className={`${inputClass} pl-8`}
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="budget-max" className={labelClass}>
                        Maximum Budget
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-muted">
                          ₹
                        </span>
                        <input
                          id="budget-max"
                          type="text"
                          inputMode="numeric"
                          value={budgetMax}
                          onChange={(e) => setBudgetMax(e.target.value.replace(/[^0-9,]/g, ""))}
                          placeholder="1,20,00,000"
                          className={`${inputClass} pl-8`}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className={labelClass}>Loan Status</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {LOAN_STATUS_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setLoan(option.value)}
                          className={`flex flex-col items-center gap-2 rounded-2xl border px-4 py-5 text-base font-medium transition-all ${
                            loan === option.value
                              ? "border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-200"
                              : "border-neutral-200 text-body hover:border-emerald-200 hover:bg-neutral-50"
                          }`}
                        >
                          <span className="text-2xl">{option.icon}</span>
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}

              {step === 3 ? (
                <>
                  <div>
                    <p className={labelClass}>Preferred Property Types</p>
                    <div className="flex flex-wrap gap-2.5">
                      {PROPERTY_TYPE_OPTIONS.map((option) => (
                        <SelectableChip
                          key={option.value}
                          label={option.label}
                          selected={types.includes(option.value)}
                          onClick={() => toggleType(option.value)}
                          size="md"
                        />
                      ))}
                    </div>
                  </div>
                  <SearchableMultiSelect
                    label="Preferred Locations"
                    placeholder="Search locations…"
                    options={PREFERRED_AREA_OPTIONS}
                    value={areas}
                    onChange={setAreas}
                  />
                </>
              ) : null}

              {step === 4 ? (
                <>
                  <div>
                    <label htmlFor="occupation" className={labelClass}>
                      Occupation
                    </label>
                    <input
                      id="occupation"
                      type="text"
                      value={occupation}
                      onChange={(e) => setOccupation(e.target.value)}
                      placeholder="e.g. Software Engineer, Business Owner"
                      className={inputClass}
                    />
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="family-size" className={labelClass}>
                        Family Size
                      </label>
                      <input
                        id="family-size"
                        type="number"
                        min={1}
                        max={20}
                        value={familySize}
                        onChange={(e) => setFamilySize(e.target.value)}
                        placeholder="Number of members"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="current-city" className={labelClass}>
                        Current City
                      </label>
                      <select
                        id="current-city"
                        value={currentCity}
                        onChange={(e) => setCurrentCity(e.target.value)}
                        className={inputClass}
                      >
                        <option value="">Select city…</option>
                        {CITY_OPTIONS.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              ) : null}

              {step === 5 ? (
                <div>
                  <label htmlFor="notes" className={labelClass}>
                    Additional Notes
                  </label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={6}
                    placeholder={`Need park facing property\nNeed possession within 6 months\nNear school\nNear airport`}
                    className={`${inputClass} resize-none leading-relaxed`}
                  />
                  <p className="mt-2 text-sm text-muted">
                    Optional — share any specific requirements or preferences.
                  </p>
                </div>
              ) : null}

              {step === 6 ? (
                <div className="space-y-4">
                  {reviewSections.map((section) => (
                    <div
                      key={section.step}
                      className="rounded-2xl border border-neutral-100 bg-neutral-50/80 p-5"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h4 className="text-base font-semibold text-heading-primary">{section.title}</h4>
                        <button
                          type="button"
                          onClick={() => goToStep(section.step, -1)}
                          className="shrink-0 text-sm font-semibold text-emerald-600 transition-colors hover:text-emerald-700"
                        >
                          Edit
                        </button>
                      </div>
                      <dl className="space-y-2.5">
                        {section.items.map((item) => (
                          <div key={item.label} className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                            <dt className="w-36 shrink-0 text-sm font-medium text-muted">
                              {item.label}
                            </dt>
                            <dd className="text-base text-heading-secondary">{item.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))}
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>

          {error ? (
            <p className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
          ) : null}
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-100 px-8 py-5">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="justify-self-start">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handlePrevious}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-xl px-4 py-3 text-base font-semibold text-body transition-colors hover:bg-neutral-100 hover:text-heading-primary disabled:opacity-50"
                >
                  ← Previous
                </button>
              ) : (
                <span />
              )}
            </div>

            <div className="justify-self-center">
              {step < TOTAL_STEPS ? (
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={saving}
                  className="rounded-xl px-4 py-3 text-sm font-medium text-muted transition-colors hover:bg-neutral-100 hover:text-body disabled:opacity-50"
                >
                  Skip this Step
                </button>
              ) : null}
            </div>

            <div className="justify-self-end">
              {step < TOTAL_STEPS ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={saving}
                  className="inline-flex min-w-[120px] items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-200/80 transition-all hover:bg-emerald-700 disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Next →"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={saving}
                  className="inline-flex min-w-[140px] items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-200/80 transition-all hover:bg-emerald-700 disabled:opacity-60"
                >
                  {saving ? "Finishing…" : "Finish Profile"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
