"use client";

import { useEffect, useMemo, useState } from "react";
import AuthAlert from "@/components/auth/AuthAlert";
import AuthButton from "@/components/auth/AuthButton";
import AuthInput from "@/components/auth/AuthInput";
import SelectableChip from "@/app/components/filters/SelectableChip";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { normalizeMobileNumber } from "@/lib/auth/mobile";
import {
  BUDGET_PRESETS,
  CITY_OPTIONS,
  PROPERTY_TYPE_PRESETS,
} from "@/lib/buyer/constants";
import { updateBuyerProfile } from "@/lib/buyer/queries";

export default function BuyerProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [city, setCity] = useState("");
  const [budgetKey, setBudgetKey] = useState(0);
  const [preferredLocations, setPreferredLocations] = useState<string[]>([]);
  const [preferredTypes, setPreferredTypes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setMobile(profile.phone ?? "");
    setCity(profile.city ?? "");
    setPreferredLocations(profile.preferred_locations ?? []);
    setPreferredTypes(profile.preferred_property_types ?? []);

    const min = profile.budget_min;
    const max = profile.budget_max;
    const index = BUDGET_PRESETS.findIndex(
      (preset) => preset.min === min && preset.max === max,
    );
    setBudgetKey(index >= 0 ? index : 0);
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

    const result = await updateBuyerProfile(profile.id, {
      full_name: fullName,
      phone: normalizeMobileNumber(mobile),
      city,
      budget_min: selectedBudget.min,
      budget_max: selectedBudget.max,
      preferred_locations: preferredLocations,
      preferred_property_types: preferredTypes,
    });

    if (result.error) {
      setError(getAuthErrorMessage(new Error(result.error)));
    } else {
      await refreshProfile();
      setSuccess("Profile updated successfully.");
    }

    setSaving(false);
  };

  const budgetLabel = useMemo(
    () => selectedBudget.label,
    [selectedBudget.label],
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
          Profile
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Update your details and property preferences
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] sm:p-8">
        {error ? <AuthAlert type="error" message={error} /> : null}
        {success ? <AuthAlert type="success" message={success} /> : null}

        <form onSubmit={handleSubmit} className="space-y-1">
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
            <label className="mb-2 block text-sm font-medium text-neutral-700">City</label>
            <select
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
            >
              <option value="">Select city</option>
              {CITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-neutral-700">Budget</label>
            <select
              value={budgetKey}
              onChange={(event) => setBudgetKey(Number(event.target.value))}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
            >
              {BUDGET_PRESETS.map((preset, index) => (
                <option key={preset.label} value={index}>
                  {preset.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-neutral-400">Selected: {budgetLabel}</p>
          </div>

          <div className="mb-4">
            <p className="mb-2 text-sm font-medium text-neutral-700">Preferred Locations</p>
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

          <div className="mb-6">
            <p className="mb-2 text-sm font-medium text-neutral-700">Preferred Property Types</p>
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

          <AuthButton type="submit" loading={saving} loadingText="Saving...">
            Save Changes
          </AuthButton>
        </form>
      </div>
    </div>
  );
}
