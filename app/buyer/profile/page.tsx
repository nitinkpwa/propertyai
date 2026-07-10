"use client";

import { useEffect, useMemo, useState } from "react";
import AuthAlert from "@/components/auth/AuthAlert";
import AuthButton from "@/components/auth/AuthButton";
import AuthInput from "@/components/auth/AuthInput";
import SelectableChip from "@/app/components/filters/SelectableChip";
import ProfileCompletionRing from "@/components/premium/ProfileCompletionRing";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useProgressiveProfile } from "@/components/buyer/ProgressiveProfileProvider";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { normalizeMobileNumber } from "@/lib/auth/mobile";
import {
  BUDGET_PRESETS,
  CITY_OPTIONS,
  PROPERTY_TYPE_PRESETS,
} from "@/lib/buyer/constants";
import {
  BUYING_PURPOSE_OPTIONS,
  BUYING_TIMELINE_OPTIONS,
  LOAN_STATUS_OPTIONS,
  labelForPurpose,
  labelForTimeline,
  labelForLoan,
} from "@/lib/buyer/profileFields";
import { updateBuyerProfile } from "@/lib/buyer/queries";
import { patchBuyerProfile } from "@/lib/buyer/profilePatch";

export default function BuyerProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const { completeness, openModal } = useProgressiveProfile();
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [city, setCity] = useState("");
  const [budgetKey, setBudgetKey] = useState(0);
  const [preferredLocations, setPreferredLocations] = useState<string[]>([]);
  const [preferredTypes, setPreferredTypes] = useState<string[]>([]);
  const [buyingPurpose, setBuyingPurpose] = useState("");
  const [buyingTimeline, setBuyingTimeline] = useState("");
  const [loanStatus, setLoanStatus] = useState("");
  const [occupation, setOccupation] = useState("");
  const [familySize, setFamilySize] = useState("");
  const [buyerNotes, setBuyerNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    const timer = window.setTimeout(() => {
      setFullName(profile.full_name ?? "");
      setMobile(profile.phone ?? "");
      setCity(profile.city ?? "");
      setPreferredLocations(profile.preferred_locations ?? []);
      setPreferredTypes(profile.preferred_property_types ?? []);
      setBuyingPurpose(profile.buying_purpose ?? "");
      setBuyingTimeline(profile.buying_timeline ?? "");
      setLoanStatus(profile.loan_status ?? "");
      setOccupation(profile.occupation ?? "");
      setFamilySize(profile.family_size ? String(profile.family_size) : "");
      setBuyerNotes(profile.buyer_notes ?? "");

      const min = profile.budget_min;
      const max = profile.budget_max;
      const index = BUDGET_PRESETS.findIndex(
        (preset) => preset.min === min && preset.max === max,
      );
      setBudgetKey(index >= 0 ? index : 0);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [profile]);

  const selectedBudget = BUDGET_PRESETS[budgetKey] ?? BUDGET_PRESETS[0];

  const toggleLocation = (location: string) => {
    setPreferredLocations((prev) =>
      prev.includes(location)
        ? prev.filter((item) => item !== location)
        : [...prev, location],
    );
  };

  const toggleType = (value: string) => {
    setPreferredTypes((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    const [basicResult, extendedResult] = await Promise.all([
      updateBuyerProfile(profile.id, {
        full_name: fullName,
        phone: normalizeMobileNumber(mobile),
        city,
        budget_min: selectedBudget.min,
        budget_max: selectedBudget.max,
        preferred_locations: preferredLocations,
        preferred_property_types: preferredTypes,
      }),
      patchBuyerProfile(profile.id, {
        buying_purpose: buyingPurpose || null,
        buying_timeline: buyingTimeline || null,
        loan_status: loanStatus || null,
        occupation: occupation.trim() || null,
        family_size: familySize ? Number(familySize) : null,
        buyer_notes: buyerNotes.trim() || null,
      }),
    ]);

    if (basicResult.error || extendedResult.error) {
      setError(getAuthErrorMessage(new Error(basicResult.error ?? extendedResult.error ?? "Save failed")));
    } else {
      await refreshProfile();
      setSuccess("Profile updated successfully.");
    }

    setSaving(false);
  };

  const summaryItems = useMemo(
    () => [
      { label: "Purpose", value: labelForPurpose(buyingPurpose) },
      { label: "Timeline", value: labelForTimeline(buyingTimeline) },
      { label: "Loan", value: labelForLoan(loanStatus) },
      { label: "Budget", value: selectedBudget.label },
    ],
    [buyingPurpose, buyingTimeline, loanStatus, selectedBudget.label],
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Profile & Preferences"
        description="Personalize your property search with AI-powered matching"
        action={
          <button
            type="button"
            onClick={() => openModal()}
            className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2"
          >
            <ProfileCompletionRing percent={completeness.percent} size="sm" showLabel={false} />
            <span className="text-xs font-semibold text-emerald-800">{completeness.percent}%</span>
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summaryItems.map((item) => (
          <Card key={item.label} padding="sm" className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-label">{item.label}</p>
            <p className="mt-1 text-xs font-semibold text-heading-secondary">{item.value}</p>
          </Card>
        ))}
      </div>

      <Card padding="lg">
        {error ? <AuthAlert type="error" message={error} /> : null}
        {success ? <AuthAlert type="success" message={success} /> : null}

        <form onSubmit={handleSubmit} className="space-y-6">
          <section>
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted">Basic Info</h2>
            <div className="space-y-1">
              <AuthInput
                label="Full Name"
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
              <AuthInput
                label="Mobile Number"
                type="tel"
                autoComplete="tel"
                inputMode="numeric"
                value={mobile}
                onChange={(event) => setMobile(event.target.value)}
                placeholder="98765 43210"
              />
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-label">City</label>
                <select
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-heading-primary outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                >
                  <option value="">Select city</option>
                  {CITY_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted">Buying Preferences</h2>
            <div className="mb-4">
              <p className="mb-2 text-sm font-medium text-label">Buying Purpose</p>
              <div className="flex flex-wrap gap-2">
                {BUYING_PURPOSE_OPTIONS.map((opt) => (
                  <SelectableChip
                    key={opt.value}
                    label={`${opt.icon} ${opt.label}`}
                    selected={buyingPurpose === opt.value}
                    onClick={() => setBuyingPurpose(opt.value)}
                    size="sm"
                  />
                ))}
              </div>
            </div>
            <div className="mb-4">
              <p className="mb-2 text-sm font-medium text-label">Purchase Timeline</p>
              <div className="flex flex-wrap gap-2">
                {BUYING_TIMELINE_OPTIONS.map((opt) => (
                  <SelectableChip
                    key={opt.value}
                    label={opt.label}
                    selected={buyingTimeline === opt.value}
                    onClick={() => setBuyingTimeline(opt.value)}
                    size="sm"
                  />
                ))}
              </div>
            </div>
            <div className="mb-4">
              <p className="mb-2 text-sm font-medium text-label">Loan Status</p>
              <div className="flex flex-wrap gap-2">
                {LOAN_STATUS_OPTIONS.map((opt) => (
                  <SelectableChip
                    key={opt.value}
                    label={`${opt.icon} ${opt.label}`}
                    selected={loanStatus === opt.value}
                    onClick={() => setLoanStatus(opt.value)}
                    size="sm"
                  />
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-label">Budget</label>
              <select
                value={budgetKey}
                onChange={(event) => setBudgetKey(Number(event.target.value))}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-heading-primary outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
              >
                {BUDGET_PRESETS.map((preset, index) => (
                  <option key={preset.label} value={index}>{preset.label}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <p className="mb-2 text-sm font-medium text-label">Preferred Locations</p>
              <div className="flex flex-wrap gap-2">
                {CITY_OPTIONS.map((location) => (
                  <SelectableChip
                    key={location}
                    label={location}
                    selected={preferredLocations.includes(location)}
                    onClick={() => toggleLocation(location)}
                    size="sm"
                  />
                ))}
              </div>
            </div>
            <div className="mb-4">
              <p className="mb-2 text-sm font-medium text-label">Preferred Property Types</p>
              <div className="flex flex-wrap gap-2">
                {PROPERTY_TYPE_PRESETS.map((type) => (
                  <SelectableChip
                    key={type.value}
                    label={type.label}
                    selected={preferredTypes.includes(type.value)}
                    onClick={() => toggleType(type.value)}
                    size="sm"
                  />
                ))}
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted">Additional Details</h2>
            <AuthInput
              label="Occupation"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder="e.g. Software Engineer"
            />
            <AuthInput
              label="Family Size"
              type="number"
              inputMode="numeric"
              value={familySize}
              onChange={(e) => setFamilySize(e.target.value)}
              placeholder="e.g. 4"
            />
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-label">Additional Notes</label>
              <textarea
                value={buyerNotes}
                onChange={(e) => setBuyerNotes(e.target.value)}
                placeholder="Any specific requirements or preferences..."
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                rows={3}
              />
            </div>
          </section>

          <AuthButton type="submit" loading={saving} loadingText="Saving...">
            Save Changes
          </AuthButton>
        </form>
      </Card>
    </div>
  );
}
