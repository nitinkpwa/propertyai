"use client";

import { useMemo, useState } from "react";
import { ADMIN_CITIES, ADMIN_SUB_TYPES, ADMIN_TYPES } from "@/lib/admin/constants";
import {
  AMENITY_CHIPS,
  FACING_OPTIONS,
  FURNISHING_OPTIONS,
  OWNERSHIP_OPTIONS,
  PROPERTY_STATUS_OPTIONS,
  PURPOSE_OPTIONS,
  WORKFLOW_STATUS_OPTIONS,
} from "@/lib/admin/property/constants";
import type { AdminPropertyFormState, WizardStepId } from "@/lib/admin/property/types";
import ConnectAssignmentCenter from "../ConnectAssignmentCenter";
import LegalVerificationCard from "../LegalVerificationCard";
import {
  Field,
  FieldGrid,
  FlagToggle,
  SectionHeader,
  SelectInput,
  TextArea,
  TextInput,
  ToggleChip,
} from "../ui/FormPrimitives";

interface Props {
  step: WizardStepId;
  form: AdminPropertyFormState;
  setForm: (form: AdminPropertyFormState) => void;
  onUploadPhotos?: (files: FileList) => void;
  uploadingPhotos?: boolean;
  propertyId?: string | null;
  adminUserId?: string | null;
  adminDisplayName?: string | null;
}

type NestedSection = "basic" | "locationMeta" | "pricing" | "specs" | "media" | "documents" | "seo" | "publishing";

export default function WizardStepContent({
  step,
  form,
  setForm,
  onUploadPhotos,
  uploadingPhotos,
  propertyId,
  adminUserId,
  adminDisplayName,
}: Props) {
  const [amenitySearch, setAmenitySearch] = useState("");

  const filteredAmenities = useMemo(() => {
    const q = amenitySearch.toLowerCase();
    return AMENITY_CHIPS.filter((a) => a.toLowerCase().includes(q));
  }, [amenitySearch]);

  const setRoot = <K extends keyof AdminPropertyFormState>(key: K, value: AdminPropertyFormState[K]) =>
    setForm({ ...form, [key]: value });

  const setNested = (
    section: NestedSection,
    key: string,
    value: string | boolean,
  ) => {
    setForm({
      ...form,
      [section]: { ...form[section], [key]: value },
    });
  };

  const toggleAmenity = (name: string) => {
    const exists = form.amenities.includes(name);
    setRoot(
      "amenities",
      exists ? form.amenities.filter((a) => a !== name) : [...form.amenities, name],
    );
  };

  if (step === "basic") {
    return (
      <>
        <SectionHeader title="Basic Information" description="Facts only — AI writes buyer-facing copy after save." />
        <FieldGrid>
          <Field label="Property Title *" span={2}>
            <TextInput value={form.title} onChange={(v) => setRoot("title", v)} placeholder="Premium 3BHK in Sector 82" />
          </Field>
          <Field label="Builder">
            <TextInput value={form.basic.builder} onChange={(v) => { setNested("basic", "builder", v); setRoot("builder_name", v); }} />
          </Field>
          <Field label="Seller">
            <TextInput value={form.basic.seller} onChange={(v) => { setNested("basic", "seller", v); setRoot("contact_name", v); }} />
          </Field>
          <Field label="Project">
            <TextInput value={form.basic.project} onChange={(v) => setNested("basic", "project", v)} />
          </Field>
          <Field label="Property Type">
            <SelectInput value={form.type} onChange={(v) => setRoot("type", v as AdminPropertyFormState["type"])} options={[...ADMIN_TYPES]} />
          </Field>
          <Field label="Configuration">
            <TextInput value={form.basic.configuration} onChange={(v) => setNested("basic", "configuration", v)} placeholder="3 BHK + Utility" />
          </Field>
          <Field label="Sub Type">
            <SelectInput value={form.sub_type} onChange={(v) => setRoot("sub_type", v as AdminPropertyFormState["sub_type"])} options={ADMIN_SUB_TYPES} />
          </Field>
          <Field label="Property Status">
            <SelectInput value={form.basic.propertyStatus} onChange={(v) => setNested("basic", "propertyStatus", v)} options={PROPERTY_STATUS_OPTIONS} />
          </Field>
          <Field label="Purpose">
            <SelectInput value={form.basic.purpose} onChange={(v) => setNested("basic", "purpose", v)} options={PURPOSE_OPTIONS} />
          </Field>
          <Field label="Ownership">
            <SelectInput value={form.basic.ownership} onChange={(v) => setNested("basic", "ownership", v)} options={OWNERSHIP_OPTIONS} />
          </Field>
          <Field label="Contact Phone">
            <TextInput value={form.contact_phone} onChange={(v) => setRoot("contact_phone", v)} />
          </Field>
          <Field label="RERA Number" span={2}>
            <TextInput value={form.rera_number} onChange={(v) => setRoot("rera_number", v)} placeholder="e.g. PBRERA-SAS80-PRXXXX" />
          </Field>
        </FieldGrid>

        <LegalVerificationCard
          form={form}
          setForm={setForm}
          propertyId={propertyId}
          adminUserId={adminUserId}
          adminDisplayName={adminDisplayName}
        />
      </>
    );
  }

  if (step === "location") {
    return (
      <>
        <SectionHeader title="Location" description="Address, coordinates and distance facts." />
        <FieldGrid>
          <Field label="Country"><TextInput value={form.locationMeta.country} onChange={(v) => setNested("locationMeta", "country", v)} /></Field>
          <Field label="State"><TextInput value={form.locationMeta.state} onChange={(v) => setNested("locationMeta", "state", v)} /></Field>
          <Field label="City"><SelectInput value={form.city} onChange={(v) => setRoot("city", v)} options={ADMIN_CITIES} /></Field>
          <Field label="Sector"><TextInput value={form.sector} onChange={(v) => setRoot("sector", v)} /></Field>
          <Field label="Locality"><TextInput value={form.locationMeta.locality} onChange={(v) => setNested("locationMeta", "locality", v)} /></Field>
          <Field label="Address / Location *" span={2}><TextInput value={form.location} onChange={(v) => setRoot("location", v)} /></Field>
          <Field label="Pincode"><TextInput value={form.locationMeta.pincode} onChange={(v) => setNested("locationMeta", "pincode", v)} /></Field>
          <Field label="Latitude"><TextInput value={form.lat} onChange={(v) => setRoot("lat", v)} type="number" /></Field>
          <Field label="Longitude"><TextInput value={form.lng} onChange={(v) => setRoot("lng", v)} type="number" /></Field>
          <Field label="Google Maps URL" span={2}><TextInput value={form.locationMeta.googleMapsUrl} onChange={(v) => setNested("locationMeta", "googleMapsUrl", v)} /></Field>
          <Field label="Landmark"><TextInput value={form.locationMeta.landmark} onChange={(v) => setNested("locationMeta", "landmark", v)} /></Field>
          <Field label="Area Category"><TextInput value={form.locationMeta.areaCategory} onChange={(v) => setNested("locationMeta", "areaCategory", v)} /></Field>
          <Field label="Upcoming Metro"><TextInput value={form.locationMeta.upcomingMetro} onChange={(v) => setNested("locationMeta", "upcomingMetro", v)} /></Field>
          <Field label="Airport Distance"><TextInput value={form.locationMeta.airportDistance} onChange={(v) => setNested("locationMeta", "airportDistance", v)} /></Field>
          <Field label="School Distance"><TextInput value={form.locationMeta.schoolDistance} onChange={(v) => setNested("locationMeta", "schoolDistance", v)} /></Field>
          <Field label="Hospital Distance"><TextInput value={form.locationMeta.hospitalDistance} onChange={(v) => setNested("locationMeta", "hospitalDistance", v)} /></Field>
          <Field label="Mall Distance"><TextInput value={form.locationMeta.mallDistance} onChange={(v) => setNested("locationMeta", "mallDistance", v)} /></Field>
          <Field label="IT Park Distance"><TextInput value={form.locationMeta.itParkDistance} onChange={(v) => setNested("locationMeta", "itParkDistance", v)} /></Field>
          <Field label="Highway Distance"><TextInput value={form.locationMeta.highwayDistance} onChange={(v) => setNested("locationMeta", "highwayDistance", v)} /></Field>
          <Field label="Future Infrastructure" span={2}><TextArea value={form.locationMeta.futureInfrastructure} onChange={(v) => setNested("locationMeta", "futureInfrastructure", v)} /></Field>
        </FieldGrid>
      </>
    );
  }

  if (step === "pricing") {
    return (
      <>
        <SectionHeader title="Pricing & Payment" description="Structured price facts for AI analysis." />
        <FieldGrid cols={3}>
          {(
            [
              ["Base Price", "basePrice"],
              ["Current Price", "currentPrice"],
              ["Launch Price", "launchPrice"],
              ["Expected Appreciation", "expectedAppreciation"],
              ["Rental Estimate", "rentalEstimate"],
              ["Price per sqft", "pricePerSqft"],
              ["Maintenance", "maintenance"],
              ["PLC", "plc"],
              ["GST", "gst"],
              ["Parking", "parking"],
              ["Registration", "registration"],
              ["Club Charges", "clubCharges"],
              ["Possession Cost", "possessionCost"],
              ["Hidden Charges", "hiddenCharges"],
              ["Down Payment", "downPayment"],
              ["EMI Estimate", "emiEstimate"],
            ] as const
          ).map(([label, key]) => (
            <Field key={key} label={label}>
              <TextInput
                value={form.pricing[key]}
                onChange={(v) => {
                  setNested("pricing", key, v);
                  if (key === "currentPrice") setRoot("price", v);
                }}
              />
            </Field>
          ))}
          <Field label="Listing Price (₹) *" span={2}>
            <TextInput value={form.price} onChange={(v) => { setRoot("price", v); setNested("pricing", "currentPrice", v); }} type="number" />
          </Field>
          <Field label="Loan Available"><SelectInput value={form.pricing.loanAvailable} onChange={(v) => setNested("pricing", "loanAvailable", v)} options={["yes", "no"]} /></Field>
          <Field label="Banks" span={2}><TextInput value={form.pricing.banks} onChange={(v) => setNested("pricing", "banks", v)} placeholder="SBI, HDFC, ICICI..." /></Field>
          <Field label="Payment Plan" span={2}><TextArea value={form.pricing.paymentPlan} onChange={(v) => setNested("pricing", "paymentPlan", v)} /></Field>
          <Field label="Construction Linked Plan" span={2}><TextArea value={form.pricing.constructionLinkedPlan} onChange={(v) => setNested("pricing", "constructionLinkedPlan", v)} /></Field>
        </FieldGrid>
      </>
    );
  }

  if (step === "specs") {
    return (
      <>
        <SectionHeader title="Specifications" description="Layout, areas and construction quality." />
        <FieldGrid cols={3}>
          <Field label="Bedrooms"><TextInput value={form.bedrooms} onChange={(v) => setRoot("bedrooms", v)} type="number" /></Field>
          <Field label="Bathrooms"><TextInput value={form.bathrooms} onChange={(v) => setRoot("bathrooms", v)} type="number" /></Field>
          <Field label="Balconies"><TextInput value={form.specs.balconies} onChange={(v) => setNested("specs", "balconies", v)} /></Field>
          <Field label="Study"><TextInput value={form.specs.study} onChange={(v) => setNested("specs", "study", v)} /></Field>
          <Field label="Servant Room"><TextInput value={form.specs.servantRoom} onChange={(v) => setNested("specs", "servantRoom", v)} /></Field>
          <Field label="Store"><TextInput value={form.specs.store} onChange={(v) => setNested("specs", "store", v)} /></Field>
          <Field label="Facing"><SelectInput value={form.facing} onChange={(v) => setRoot("facing", v)} options={FACING_OPTIONS} /></Field>
          <Field label="Floor"><TextInput value={form.specs.floor} onChange={(v) => setNested("specs", "floor", v)} /></Field>
          <Field label="Total Floors"><TextInput value={form.specs.totalFloors} onChange={(v) => setNested("specs", "totalFloors", v)} /></Field>
          <Field label="Lift"><TextInput value={form.specs.lift} onChange={(v) => setNested("specs", "lift", v)} /></Field>
          <Field label="Power Backup"><TextInput value={form.specs.powerBackup} onChange={(v) => setNested("specs", "powerBackup", v)} /></Field>
          <Field label="Furnished"><SelectInput value={form.furnishing} onChange={(v) => setRoot("furnishing", v)} options={FURNISHING_OPTIONS} /></Field>
          <Field label="Carpet Area"><TextInput value={form.specs.carpetArea} onChange={(v) => { setNested("specs", "carpetArea", v); setRoot("area_sqft", v); }} /></Field>
          <Field label="Built-up Area"><TextInput value={form.specs.builtUpArea} onChange={(v) => setNested("specs", "builtUpArea", v)} /></Field>
          <Field label="Super Area"><TextInput value={form.specs.superArea} onChange={(v) => setNested("specs", "superArea", v)} /></Field>
          <Field label="Plot Area"><TextInput value={form.specs.plotArea} onChange={(v) => setNested("specs", "plotArea", v)} /></Field>
          <Field label="Ceiling Height"><TextInput value={form.specs.ceilingHeight} onChange={(v) => setNested("specs", "ceilingHeight", v)} /></Field>
          <Field label="Construction Quality"><TextInput value={form.specs.constructionQuality} onChange={(v) => setNested("specs", "constructionQuality", v)} /></Field>
          <Field label="Green Rating"><TextInput value={form.specs.greenRating} onChange={(v) => setNested("specs", "greenRating", v)} /></Field>
          <Field label="RERA Number" span={2}><TextInput value={form.rera_number} onChange={(v) => setRoot("rera_number", v)} /></Field>
          <Field label="Possession"><TextInput value={form.possession} onChange={(v) => setRoot("possession", v)} /></Field>
        </FieldGrid>
      </>
    );
  }

  if (step === "amenities") {
    return (
      <>
        <SectionHeader title="Amenities" description="Select amenities present at this property." />
        <TextInput value={amenitySearch} onChange={setAmenitySearch} placeholder="Search amenities..." />
        <div className="mt-4 flex flex-wrap gap-2">
          {filteredAmenities.map((amenity) => (
            <ToggleChip key={amenity} label={amenity} selected={form.amenities.includes(amenity)} onToggle={() => toggleAmenity(amenity)} />
          ))}
        </div>
        <p className="mt-4 text-xs text-muted">{form.amenities.length} selected</p>
      </>
    );
  }

  if (step === "media") {
    return (
      <>
        <SectionHeader title="Media" description="Photos and video assets." />
        <FieldGrid>
          <Field label="Photos" span={2}>
            <div className="flex flex-wrap gap-3">
              {form.photos.map((url, i) => (
                <div key={url + i} className="relative h-24 w-32 overflow-hidden rounded-xl border border-neutral-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => setRoot("photos", form.photos.filter((_, idx) => idx !== i))} className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 text-xs text-white">×</button>
                </div>
              ))}
              <label className="flex h-24 w-32 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50 text-xs text-muted hover:border-emerald-300">
                {uploadingPhotos ? "Uploading..." : "+ Upload"}
                <input type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && onUploadPhotos?.(e.target.files)} />
              </label>
            </div>
          </Field>
          <Field label="Virtual Tour URL"><TextInput value={form.media.virtualTourUrl} onChange={(v) => setNested("media", "virtualTourUrl", v)} /></Field>
          <Field label="YouTube"><TextInput value={form.media.youtube} onChange={(v) => setNested("media", "youtube", v)} /></Field>
          <Field label="360° Tour"><TextInput value={form.media.tour360} onChange={(v) => setNested("media", "tour360", v)} /></Field>
          <Field label="Drone Video"><TextInput value={form.media.droneVideo} onChange={(v) => setNested("media", "droneVideo", v)} /></Field>
        </FieldGrid>
      </>
    );
  }

  if (step === "documents") {
    return (
      <>
        <SectionHeader title="Documents" description="Brochures, floor plans and PDFs." />
        <FieldGrid>
          <Field label="Brochure URL"><TextInput value={form.documents.brochure} onChange={(v) => setNested("documents", "brochure", v)} /></Field>
          <Field label="Master Plan"><TextInput value={form.documents.masterPlan} onChange={(v) => setNested("documents", "masterPlan", v)} /></Field>
          <Field label="PDF Document"><TextInput value={form.documents.pdf} onChange={(v) => setNested("documents", "pdf", v)} /></Field>
          <Field label="Floor Plan URLs" span={2}>
            <TextArea
              value={form.documents.floorPlans.join("\n")}
              onChange={(v) => setForm({ ...form, documents: { ...form.documents, floorPlans: v.split("\n").map((s) => s.trim()).filter(Boolean) } })}
              placeholder="One URL per line"
            />
          </Field>
        </FieldGrid>
      </>
    );
  }

  if (step === "seo") {
    return (
      <>
        <SectionHeader title="SEO Facts" description="Optional URL overrides. Meta title, description and schema are AI-generated on save." />
        <FieldGrid>
          <Field label="Slug"><TextInput value={form.seo.slug} onChange={(v) => setNested("seo", "slug", v)} placeholder="auto-generated from title if empty" /></Field>
          <Field label="Canonical URL"><TextInput value={form.seo.canonical} onChange={(v) => setNested("seo", "canonical", v)} /></Field>
        </FieldGrid>
        <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          SEO Agent generates meta title, description, keywords and structured schema automatically after you save.
        </p>
      </>
    );
  }

  if (step === "connect") {
    return <ConnectAssignmentCenter form={form} setForm={setForm} />;
  }

  return (
    <>
      <SectionHeader title="Publishing" description="Workflow status and listing flags." />
      <FieldGrid>
        <Field label="Workflow Status">
          <SelectInput value={form.publishing.workflowStatus} onChange={(v) => setNested("publishing", "workflowStatus", v)} options={WORKFLOW_STATUS_OPTIONS} />
        </Field>
      </FieldGrid>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <FlagToggle label="Featured" checked={form.publishing.featured} onChange={(v) => setNested("publishing", "featured", v)} />
        <FlagToggle label="Trending" checked={form.publishing.trending} onChange={(v) => setNested("publishing", "trending", v)} />
        <FlagToggle label="Premium" checked={form.publishing.premium} onChange={(v) => setNested("publishing", "premium", v)} />
        <FlagToggle label="Exclusive" checked={form.publishing.exclusive} onChange={(v) => setNested("publishing", "exclusive", v)} />
        <FlagToggle label="Editor's Pick" checked={form.publishing.editorsPick} onChange={(v) => setNested("publishing", "editorsPick", v)} />
        <FlagToggle
          label="Enable Site Visits"
          checked={form.site_visit_enabled !== false}
          onChange={(v) => setForm({ ...form, site_visit_enabled: v })}
        />
      </div>
      <p className="mt-3 text-xs text-muted">
        When disabled, buyers see “Site visits are temporarily unavailable” and cannot request a visit.
      </p>
    </>
  );
}
