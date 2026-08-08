"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { uploadAdminPropertyPhoto } from "@/lib/admin/property/saveProperty";
import {
  MAX_PROPERTY_PHOTOS,
  appendPhotos,
  normalizePhotosWithCover,
  removePhotoAtIndex,
  reorderPhotos,
  replacePhotoAtIndex,
  setCoverAtIndex,
} from "@/lib/admin/property/mediaHelpers";
import UploadDropzone from "./studio/UploadDropzone";

export interface MediaChange {
  photos: string[];
  featured_image: string;
}

interface Props {
  photos: string[];
  featuredImage: string;
  onChange: (next: MediaChange) => void;
  adminUserId: string;
  maxPhotos?: number;
}

export default function PropertyMediaManager({
  photos,
  featuredImage,
  onChange,
  adminUserId,
  maxPhotos = MAX_PROPERTY_PHOTOS,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const photosRef = useRef(photos);
  const featuredRef = useRef(featuredImage);
  const onChangeRef = useRef(onChange);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetRef = useRef<number | null>(null);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    featuredRef.current = featuredImage;
  }, [featuredImage]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (menuOpen === null) return;
    const onDoc = () => setMenuOpen(null);
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [menuOpen]);

  const emit = useCallback((next: MediaChange) => {
    const normalized = normalizePhotosWithCover(next.photos, next.featured_image);
    photosRef.current = normalized.photos;
    featuredRef.current = normalized.featured_image;
    onChangeRef.current(normalized);
  }, []);

  const remaining = Math.max(0, maxPhotos - photos.length);
  const coverUrl = featuredImage || photos[0] || "";

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (!files.length || !adminUserId) return;
      const room = Math.max(0, maxPhotos - photosRef.current.length);
      if (room <= 0) {
        setError(`Maximum of ${maxPhotos} photos reached.`);
        return;
      }

      setUploading(true);
      setError(null);
      const accepted = files.slice(0, room);
      const uploaded: string[] = [];
      const failed: string[] = [];

      for (const file of accepted) {
        const url = await uploadAdminPropertyPhoto(file, adminUserId);
        if (url) uploaded.push(url);
        else failed.push(file.name);
      }

      if (uploaded.length) {
        emit(appendPhotos(photosRef.current, featuredRef.current, uploaded, maxPhotos));
      }
      if (failed.length) {
        setError(
          uploaded.length
            ? `Uploaded ${uploaded.length}; failed: ${failed.join(", ")}`
            : "Image upload failed. Check file type (JPEG/PNG/WebP), size (max 8MB), and storage permissions.",
        );
      } else if (!uploaded.length && accepted.length) {
        setError("No images were uploaded.");
      }
      setUploading(false);
    },
    [adminUserId, emit, maxPhotos],
  );

  const handleReplace = useCallback(
    async (index: number, file: File) => {
      if (!adminUserId || index < 0) return;
      setReplacingIndex(index);
      setError(null);
      setMenuOpen(null);
      const url = await uploadAdminPropertyPhoto(file, adminUserId);
      if (!url) {
        setError("Replace failed. Use JPEG/PNG/WebP under 8MB.");
        setReplacingIndex(null);
        return;
      }
      emit(replacePhotoAtIndex(photosRef.current, featuredRef.current, index, url));
      setReplacingIndex(null);
    },
    [adminUserId, emit],
  );

  const openReplacePicker = (index: number) => {
    setMenuOpen(null);
    replaceTargetRef.current = index;
    replaceInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-heading-primary">
            {photos.length} {photos.length === 1 ? "Photo" : "Photos"}
          </p>
          <p className="text-xs text-muted">
            Cover photo appears first on cards, map, search, and the property page.
          </p>
        </div>
        {coverUrl ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverUrl} alt="" className="h-8 w-10 rounded-md object-cover" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Cover Photo</p>
              <p className="text-[11px] text-emerald-800/80">Primary listing image</p>
            </div>
          </div>
        ) : null}
      </div>

      {photos.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((url, index) => {
            const isCover = (featuredImage || photos[0]) === url && index === 0;
            const isReplacing = replacingIndex === index;
            const isDragOver = dragOver === index && dragFrom !== index;

            return (
              <li
                key={`${url}-${index}`}
                draggable={!uploading && replacingIndex === null}
                onDragStart={(e) => {
                  setDragFrom(index);
                  e.dataTransfer.setData("text/plain", String(index));
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(index);
                }}
                onDragLeave={() => setDragOver((v) => (v === index ? null : v))}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = Number(e.dataTransfer.getData("text/plain"));
                  setDragFrom(null);
                  setDragOver(null);
                  if (!Number.isNaN(from)) {
                    emit(reorderPhotos(photosRef.current, from, index));
                  }
                }}
                onDragEnd={() => {
                  setDragFrom(null);
                  setDragOver(null);
                }}
                className={`group relative overflow-hidden rounded-xl border bg-neutral-50 shadow-sm transition ${
                  isDragOver ? "border-emerald-400 ring-2 ring-emerald-200" : "border-neutral-200"
                } ${isCover ? "ring-2 ring-emerald-400/70" : ""}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Photo ${index + 1}`}
                  className={`aspect-square w-full object-cover transition ${isReplacing ? "opacity-40" : ""}`}
                />

                <div className="absolute left-1.5 top-1.5 flex items-center gap-1">
                  <span
                    className="cursor-grab rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] text-white active:cursor-grabbing"
                    title="Drag to reorder"
                    aria-label="Drag to reorder"
                  >
                    ⠿
                  </span>
                  {isCover ? (
                    <span className="rounded-md bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                      ⭐ Cover
                    </span>
                  ) : null}
                </div>

                <div className="absolute right-1.5 top-1.5 z-30">
                  <button
                    type="button"
                    aria-label="Photo options"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen((v) => (v === index ? null : index));
                    }}
                    className="rounded-md bg-black/60 px-2 py-0.5 text-xs font-bold text-white hover:bg-black/80"
                  >
                    ···
                  </button>
                  {menuOpen === index ? (
                    <div
                      className="absolute right-0 top-7 z-30 min-w-[140px] overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-lg"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!isCover ? (
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-heading-secondary hover:bg-emerald-50"
                          onClick={() => {
                            setMenuOpen(null);
                            emit(setCoverAtIndex(photosRef.current, featuredRef.current, index));
                          }}
                        >
                          ⭐ Set as Cover
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-heading-secondary hover:bg-neutral-50"
                        onClick={() => openReplacePicker(index)}
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50"
                        onClick={() => {
                          setMenuOpen(null);
                          emit(removePhotoAtIndex(photosRef.current, featuredRef.current, index));
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>

                {isReplacing ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <span className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  </div>
                ) : null}

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-2 py-1.5">
                  <p className="text-[10px] font-medium text-white">Photo {index + 1}</p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-6 text-center text-sm text-muted">
          No photos yet. Upload images below — existing photos stay visible while new ones upload.
        </p>
      )}

      <input
        ref={replaceInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          const index = replaceTargetRef.current;
          replaceTargetRef.current = null;
          e.target.value = "";
          if (file && index !== null) void handleReplace(index, file);
        }}
      />

      {remaining > 0 ? (
        <UploadDropzone
          accept="image/jpeg,image/png,image/webp,image/jpg"
          multiple
          label={uploading ? "Uploading…" : "Add photos"}
          hint={`Drag & drop or click · JPEG/PNG/WebP · max 8MB · ${remaining} slot${remaining === 1 ? "" : "s"} left`}
          disabled={uploading || !adminUserId}
          onFiles={(files) => void uploadFiles(files)}
        />
      ) : (
        <p className="text-xs text-amber-700">Maximum of {maxPhotos} photos reached. Delete or replace an image to add more.</p>
      )}

      {uploading ? (
        <p className="text-xs font-medium text-emerald-700">Uploading… existing photos remain visible.</p>
      ) : null}
      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
      {!adminUserId ? (
        <p className="text-xs font-medium text-rose-600">Sign in required to upload photos.</p>
      ) : null}
    </div>
  );
}
