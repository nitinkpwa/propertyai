"use client";

import type { BrainFact, GenerateAction, PropertyImportResult } from "@/lib/admin/property/studio/types";
import type { AdminPropertyFormState } from "@/lib/admin/property/types";
import AiReviewSidebar from "./AiReviewSidebar";
import ConfidenceField from "./ConfidenceField";
import MasterReviewActions from "./MasterReviewActions";
import SemanticFactsPanel from "./SemanticFactsPanel";

interface Props {
  form: AdminPropertyFormState;
  result: PropertyImportResult;
  onChange: (form: AdminPropertyFormState) => void;
  onApprove: () => void;
  onReject: () => void;
  onEditManual: () => void;
  onGenerate: (action: GenerateAction) => void;
  busyAction: GenerateAction | null;
  generatedCopy: { title: string; content: string } | null;
  saving?: boolean;
  duplicateHint?: string | null;
  message?: string;
}

function applySemanticEdit(
  form: AdminPropertyFormState,
  key: string,
  value: string,
): AdminPropertyFormState {
  const knowledge = form.importKnowledge;
  const brainFacts: BrainFact[] = (knowledge?.brainFacts || []).map((f) =>
    f.key === key ? { ...f, value } : f,
  );
  const structuredFields = {
    ...(knowledge?.structuredFields || {}),
    [key]: value,
  };

  let next: AdminPropertyFormState = {
    ...form,
    importKnowledge: knowledge
      ? {
          ...knowledge,
          brainFacts,
          structuredFields,
          semanticSearchText: brainFacts.map((f) => `${f.label}: ${f.value}`).join("\n"),
          fieldConfidence: form.fieldConfidence,
        }
      : knowledge,
  };

  // Keep core form fields in sync with semantic edits
  switch (key) {
    case "projectName":
      next = { ...next, title: value, basic: { ...next.basic, project: value } };
      break;
    case "builder":
    case "developer":
      next = { ...next, builder_name: value, basic: { ...next.basic, builder: value } };
      break;
    case "propertyType":
      next = { ...next, basic: { ...next.basic, configuration: next.basic.configuration || value } };
      break;
    case "configuration":
      next = { ...next, basic: { ...next.basic, configuration: value } };
      break;
    case "price":
      next = { ...next, price: value, pricing: { ...next.pricing, currentPrice: value } };
      break;
    case "pricePerYard":
    case "pricePerSqyd":
      next = {
        ...next,
        pricing: { ...next.pricing, pricePerSqyd: value },
      };
      break;
    case "pricePerSqFt":
      next = {
        ...next,
        pricing: { ...next.pricing, pricePerSqft: value },
      };
      break;
    case "pricePerAcre":
      next = {
        ...next,
        pricing: { ...next.pricing, pricePerAcre: value },
      };
      break;
    case "totalPrice":
      next = {
        ...next,
        price: value,
        pricing: { ...next.pricing, totalPrice: value, currentPrice: value },
      };
      break;
    case "minPlotSize":
    case "maxPlotSize":
    case "plotSizeUnit":
    case "plotSizes": {
      const sf = { ...structuredFields, [key]: value } as Record<string, string>;
      const min = sf.minPlotSize || "";
      const max = sf.maxPlotSize || "";
      const unit = sf.plotSizeUnit || "Sq Yard";
      const label =
        sf.plotSizes ||
        (min && max ? `${min}–${max} ${unit}` : min ? `${min} ${unit}` : "");
      next = {
        ...next,
        specs: {
          ...next.specs,
          minPlotSize: min,
          maxPlotSize: max,
          plotSizeUnit: unit,
          plotArea: label,
        },
      };
      break;
    }
    case "rera":
    case "reraStatus":
      next = {
        ...next,
        rera_number: key === "rera" ? value : next.rera_number || `RERA ${value}`,
      };
      break;
    case "possession":
    case "launchStatus":
      next = { ...next, possession: value };
      break;
    case "city":
      next = { ...next, city: value };
      break;
    case "sector":
      next = { ...next, sector: value };
      break;
    case "location":
    case "locality":
      next = {
        ...next,
        location: value,
        locationMeta: { ...next.locationMeta, locality: value },
      };
      break;
    case "nearbyLandmark":
    case "landmark":
      next = { ...next, locationMeta: { ...next.locationMeta, landmark: value } };
      break;
    case "nearbyAirport":
    case "airportProximity":
    case "airportDistance": {
      const sf = structuredFields as Record<string, string>;
      const display = [sf.airportProximity, sf.nearbyAirport || value, sf.airportDistance]
        .filter(Boolean)
        .filter((v, i, a) => a.indexOf(v) === i)
        .join(" — ");
      next = {
        ...next,
        locationMeta: { ...next.locationMeta, airportDistance: display || value },
      };
      break;
    }
    case "areaType":
    case "segment":
      next = { ...next, locationMeta: { ...next.locationMeta, areaCategory: value } };
      break;
    case "roadWidth":
    case "roadName":
    case "roadStatus":
    case "connectivityAdvantage":
    case "connectivity": {
      const sf = structuredFields as Record<string, string>;
      const infra = [
        [sf.roadStatus, sf.roadWidth, sf.roadName].filter(Boolean).join(" "),
        sf.connectivityAdvantage,
        sf.connectivity ? `${sf.connectivity} connectivity` : "",
        sf.areaType,
      ]
        .filter(Boolean)
        .join(" · ");
      next = {
        ...next,
        locationMeta: { ...next.locationMeta, futureInfrastructure: infra },
      };
      break;
    }
    case "suitableFor":
      next = {
        ...next,
        basic: {
          ...next.basic,
          purpose: /invest/i.test(value) ? "investment" : next.basic.purpose,
        },
      };
      break;
    case "phone":
      next = { ...next, contact_phone: value };
      break;
    case "facing":
      next = { ...next, facing: value };
      break;
    case "paymentPlan":
      next = { ...next, pricing: { ...next.pricing, paymentPlan: value } };
      break;
    default:
      break;
  }

  return next;
}

export default function AiReviewScreen({
  form,
  result,
  onChange,
  onApprove,
  onReject,
  onEditManual,
  onGenerate,
  busyAction,
  generatedCopy,
  saving,
  duplicateHint,
  message,
}: Props) {
  const conf = form.fieldConfidence || result.fieldConfidence || {};
  const brainFacts = form.importKnowledge?.brainFacts || result.brainFacts || [];
  const semanticValues: Record<string, string> = {};
  for (const fact of brainFacts) {
    const structured = form.importKnowledge?.structuredFields?.[fact.key];
    semanticValues[fact.key] =
      typeof structured === "string" ? structured : fact.value;
  }

  const setRoot = <K extends keyof AdminPropertyFormState>(key: K, value: AdminPropertyFormState[K]) => {
    onChange({ ...form, [key]: value });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
            AI Review Mode
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-heading-primary sm:text-3xl">
            Review extracted listing
          </h1>
          <p className="mt-1 text-sm text-muted">
            Semantic facts extracted for the AreaIQ Brain. Edit anything — nothing publishes until Approve.
          </p>
        </div>
      </header>

      <MasterReviewActions
        form={form}
        busyAction={busyAction}
        onGenerate={onGenerate}
        onApprove={onApprove}
        onReject={onReject}
        onEditManual={onEditManual}
        saving={saving}
      />

      {message ? (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            message.includes("✅")
              ? "bg-emerald-50 text-emerald-700"
              : message.includes("Error")
                ? "bg-rose-50 text-rose-700"
                : "bg-amber-50 text-amber-800"
          }`}
        >
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-8 rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-md sm:p-6">
          <SemanticFactsPanel
            facts={brainFacts}
            values={semanticValues}
            onChange={(key, value) => onChange(applySemanticEdit(form, key, value))}
          />

          <div className="border-t border-neutral-100 pt-6">
            <h2 className="mb-3 text-sm font-bold text-heading-primary">Core listing fields</h2>
            <section className="grid gap-4 sm:grid-cols-2">
              <ConfidenceField
                label="Project / Title"
                value={form.title}
                confidence={conf.title || conf.projectName}
                onChange={(v) =>
                  onChange({
                    ...form,
                    title: v,
                    basic: { ...form.basic, project: v },
                  })
                }
              />
              <ConfidenceField
                label="Builder"
                value={form.builder_name}
                confidence={conf.builder_name || conf.builder}
                onChange={(v) =>
                  onChange({
                    ...form,
                    builder_name: v,
                    basic: { ...form.basic, builder: v },
                  })
                }
              />
              <ConfidenceField
                label="Price (INR)"
                value={form.price}
                confidence={conf.price || conf["pricing.currentPrice"]}
                onChange={(v) =>
                  onChange({
                    ...form,
                    price: v,
                    pricing: { ...form.pricing, currentPrice: v },
                  })
                }
              />
              <ConfidenceField
                label="Phone"
                value={form.contact_phone}
                confidence={conf.contact_phone || conf.phone}
                onChange={(v) => setRoot("contact_phone", v)}
              />
            </section>

            <div className="mt-4">
              <ConfidenceField
                label="Location"
                value={form.location}
                confidence={conf.location || conf["locationMeta.locality"]}
                onChange={(v) => setRoot("location", v)}
              />
            </div>

            <div className="mt-4">
              <ConfidenceField
                label="Amenities (comma separated)"
                value={form.amenities.join(", ")}
                confidence={conf.amenities}
                onChange={(v) =>
                  setRoot(
                    "amenities",
                    v
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  )
                }
                multiline
              />
            </div>

            <p className="mt-4 text-xs text-muted">
              Photos: {form.photos.length} · Brain facts: {brainFacts.length} · SEO:{" "}
              {form.seo.slug || "—"}
            </p>
          </div>
        </div>

        <AiReviewSidebar
          form={form}
          result={result}
          generatedCopy={generatedCopy}
          duplicateHint={duplicateHint}
        />
      </div>
    </div>
  );
}
