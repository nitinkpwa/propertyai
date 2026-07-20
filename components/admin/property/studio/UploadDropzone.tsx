"use client";

import { useCallback, useState } from "react";

interface Props {
  accept: string;
  multiple?: boolean;
  label: string;
  hint: string;
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

export default function UploadDropzone({
  accept,
  multiple = true,
  label,
  hint,
  onFiles,
  disabled,
}: Props) {
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    (list: FileList | null) => {
      if (!list?.length || disabled) return;
      onFiles(Array.from(list));
    },
    [disabled, onFiles],
  );

  return (
    <label
      onDragEnter={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={`flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-8 text-center transition active:scale-[0.99] sm:min-h-[180px] sm:px-6 sm:py-10 ${
        dragging
          ? "border-emerald-500 bg-emerald-50/80 shadow-[0_0_0_4px_rgba(74,170,39,0.12)]"
          : "border-neutral-200 bg-white/70 hover:border-emerald-300 hover:bg-emerald-50/40"
      } ${disabled ? "pointer-events-none opacity-50" : ""}`}
    >
      <span className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 sm:h-12 sm:w-12">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 16V4m0 0l-4 4m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 16.5V18a2 2 0 002 2h12a2 2 0 002-2v-1.5" strokeLinecap="round" />
        </svg>
      </span>
      <span className="text-base font-semibold text-heading-primary sm:text-sm">{label}</span>
      <span className="mt-1 max-w-sm text-xs text-muted">{hint}</span>
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </label>
  );
}
