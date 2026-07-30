"use client";

import { useId, useState } from "react";
import { ui } from "@/lib/design/tokens";

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | null;
  /** Stable key for scroll-to-error / focusFirstFieldError */
  fieldKey?: string;
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
          stroke="currentColor"
          strokeWidth="1.75"
        />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
      </svg>
    );
  }

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 3l18 18M10.58 10.58A3 3 0 0 0 12 15a3 3 0 0 0 2.42-4.42M9.88 4.24A10.94 10.94 0 0 1 12 4c6.5 0 10 7 10 7a18.3 18.3 0 0 1-4.12 5.12M6.12 6.12A18.3 18.3 0 0 0 2 12s3.5 7 10 7a10.94 10.94 0 0 0 2.76-.36"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function AuthInput({
  label,
  error,
  fieldKey,
  type = "text",
  className = "",
  id,
  placeholder = " ",
  ...props
}: AuthInputProps) {
  const [visible, setVisible] = useState(false);
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  const isPassword = type === "password";
  const inputType = isPassword && visible ? "text" : type;

  return (
    <div className="mb-4" data-field={fieldKey}>
      <div className="relative">
        <input
          id={inputId}
          type={inputType}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`${ui.input} text-[16px] sm:text-base ${
            error ? "border-rose-300 focus:border-rose-400 focus:ring-rose-500/10" : ""
          } ${isPassword ? "pr-12" : ""} ${className}`}
          {...props}
        />
        <label htmlFor={inputId} className={ui.labelFloat}>
          {label}
        </label>
        {isPassword ? (
          <button
            type="button"
            onClick={() => setVisible((value) => !value)}
            className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center text-placeholder transition-colors hover:text-body"
            aria-label={visible ? "Hide password" : "Show password"}
          >
            <EyeIcon open={visible} />
          </button>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} className="mt-1.5 text-sm font-medium leading-snug text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
