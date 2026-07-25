"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  uploadAdminPropertyDocument,
  uploadAdminPropertyPhoto,
} from "@/lib/admin/property/saveProperty";
import type { StudioDocumentRef, StudioImageRef } from "@/lib/admin/property/studio/types";
import DocumentList from "./DocumentList";
import ImageSortableGrid from "./ImageSortableGrid";
import LocationPinField from "./LocationPinField";
import UploadDropzone from "./UploadDropzone";

export interface AiImportPayload {
  whatsappText: string;
  images: StudioImageRef[];
  documents: StudioDocumentRef[];
  googleMapsUrl: string;
  lat: string;
  lng: string;
}

interface Props {
  adminUserId: string;
  onGenerate: (payload: AiImportPayload) => void;
  generating?: boolean;
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function guessCategory(name: string): StudioDocumentRef["category"] {
  const n = name.toLowerCase();
  if (n.includes("brochure")) return "brochure";
  if (n.includes("price")) return "price_list";
  if (n.includes("layout") || n.includes("floor")) return "layout";
  if (n.includes("payment")) return "payment_plan";
  if (n.includes("rera")) return "rera";
  if (n.includes("master")) return "master_plan";
  return "other";
}

export default function AiImportWorkspace({ adminUserId, onGenerate, generating }: Props) {
  const [whatsappText, setWhatsappText] = useState("");
  const [images, setImages] = useState<StudioImageRef[]>([]);
  const [documents, setDocuments] = useState<StudioDocumentRef[]>([]);
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleImages = async (files: File[]) => {
    setUploading(true);
    setError("");
    const accepted = files.filter((f) => /image\/(jpeg|png|webp)/i.test(f.type) || /\.(jpe?g|png|webp)$/i.test(f.name));
    const uploaded: StudioImageRef[] = [];
    for (const file of accepted.slice(0, 20 - images.length)) {
      const url = await uploadAdminPropertyPhoto(file, adminUserId);
      if (url) uploaded.push({ id: uid(), url, name: file.name });
    }
    if (uploaded.length) setImages((prev) => [...prev, ...uploaded]);
    else if (accepted.length) setError("Image upload failed. Check storage permissions.");
    setUploading(false);
  };

  const handleDocs = async (files: File[]) => {
    setUploading(true);
    setError("");
    const pdfs = files.filter((f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name));
    const uploaded: StudioDocumentRef[] = [];
    for (const file of pdfs.slice(0, 15 - documents.length)) {
      const url = await uploadAdminPropertyDocument(file, adminUserId);
      if (url) {
        uploaded.push({
          id: uid(),
          url,
          name: file.name,
          category: guessCategory(file.name),
        });
      }
    }
    if (uploaded.length) setDocuments((prev) => [...prev, ...uploaded]);
    else if (pdfs.length) setError("Document upload failed. Check storage permissions.");
    setUploading(false);
  };

  const canGenerate =
    Boolean(whatsappText.trim()) || images.length > 0 || documents.length > 0;

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/60 bg-gradient-to-br from-white via-emerald-50/40 to-white shadow-[0_20px_60px_-28px_rgba(50,111,26,0.35)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(74,170,39,0.12), transparent 40%), radial-gradient(circle at 80% 0%, rgba(74,170,39,0.08), transparent 35%)",
        }}
      />

      <div className="relative space-y-8 p-6 sm:p-8">
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-none lg:max-w-4xl"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
            AreaIQ AI
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-heading-primary sm:text-4xl">
            AreaIQ AI Property Studio
          </h1>
          <p className="mt-2 text-sm text-muted sm:text-base">
            Drop a WhatsApp pitch, photos, and PDFs — AI builds a complete structured listing in under a minute.
          </p>
        </motion.header>

        <section className="rounded-2xl border border-white/80 bg-white/70 p-5 shadow-sm backdrop-blur-md sm:p-6">
          <h2 className="text-sm font-bold text-heading-primary">1 · Paste WhatsApp Message</h2>
          <textarea
            value={whatsappText}
            onChange={(e) => setWhatsappText(e.target.value)}
            rows={8}
            placeholder="Paste builder marketing message here..."
            className="mt-3 w-full resize-y rounded-2xl border border-neutral-200 bg-white/90 px-4 py-3 text-sm leading-relaxed text-input outline-none ring-emerald-500/25 placeholder:text-placeholder focus:ring-2"
          />
        </section>

        <section className="rounded-2xl border border-white/80 bg-white/70 p-5 shadow-sm backdrop-blur-md sm:p-6">
          <h2 className="text-sm font-bold text-heading-primary">2 · Upload Images</h2>
          <p className="mt-1 text-xs text-muted">JPG, PNG, WebP · drag to reorder · first image is cover</p>
          <div className="mt-3">
            <UploadDropzone
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              label="Drag & drop property images"
              hint="Multiple upload supported"
              onFiles={handleImages}
              disabled={uploading || generating}
            />
          </div>
          <ImageSortableGrid images={images} onChange={setImages} />
        </section>

        <section className="rounded-2xl border border-white/80 bg-white/70 p-5 shadow-sm backdrop-blur-md sm:p-6">
          <h2 className="text-sm font-bold text-heading-primary">3 · Upload Documents</h2>
          <p className="mt-1 text-xs text-muted">
            Brochure · Price List · Layout · Payment Plan · RERA · Master Plan · PDF
          </p>
          <div className="mt-3">
            <UploadDropzone
              accept="application/pdf,.pdf"
              label="Drag & drop PDF documents"
              hint="Multiple supporting documents"
              onFiles={handleDocs}
              disabled={uploading || generating}
            />
          </div>
          <DocumentList
            documents={documents}
            onRemove={(id) => setDocuments((prev) => prev.filter((d) => d.id !== id))}
          />
        </section>

        <section className="rounded-2xl border border-white/80 bg-white/70 p-5 shadow-sm backdrop-blur-md sm:p-6">
          <h2 className="text-sm font-bold text-heading-primary">4 · Google Maps Location</h2>
          <p className="mt-1 text-xs text-muted">Optional</p>
          <div className="mt-3">
            <LocationPinField
              googleMapsUrl={googleMapsUrl}
              lat={lat}
              lng={lng}
              onChange={(next) => {
                setGoogleMapsUrl(next.googleMapsUrl);
                setLat(next.lat);
                setLng(next.lng);
              }}
            />
          </div>
        </section>

        {error ? (
          <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}

        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          disabled={!canGenerate || uploading || generating}
          onClick={() =>
            onGenerate({ whatsappText, images, documents, googleMapsUrl, lat, lng })
          }
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-4 text-base font-bold text-white shadow-[0_12px_30px_-10px_rgba(74,170,39,0.65)] transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? "Uploading..." : generating ? "Generating..." : "Generate Listing with AI"}
        </motion.button>
      </div>
    </div>
  );
}
