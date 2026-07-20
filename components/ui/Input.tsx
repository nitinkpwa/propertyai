"use client";

import { forwardRef, useId } from "react";
import { ui } from "@/lib/design/tokens";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightSlot?: React.ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    hint,
    leftIcon,
    rightSlot,
    className = "",
    containerClassName = "",
    id,
    placeholder = " ",
    ...props
  },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className={`w-full ${containerClassName}`}>
      <div className="relative">
        {leftIcon ? (
          <span className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-muted">
            {leftIcon}
          </span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={`${ui.input} ${leftIcon ? "pl-11" : ""} ${rightSlot ? "pr-12" : ""} ${
            error ? "border-rose-300 focus:border-rose-400 focus:ring-rose-500/10" : ""
          } ${className}`}
          {...props}
        />
        <label htmlFor={inputId} className={`${ui.labelFloat} ${leftIcon ? "left-11" : ""}`}>
          {label}
        </label>
        {rightSlot ? (
          <span className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</span>
        ) : null}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs text-rose-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, className = "", id, placeholder = " ", ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className="w-full">
      <div className="relative">
        <textarea
          ref={ref}
          id={inputId}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          className={`peer min-h-[120px] w-full resize-y rounded-xl border border-neutral-200 bg-neutral-50 px-4 pb-3 pt-6 text-base text-input outline-none transition-all placeholder:text-transparent focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/10 ${
            error ? "border-rose-300" : ""
          } ${className}`}
          {...props}
        />
        <label
          htmlFor={inputId}
          className="pointer-events-none absolute left-4 top-3.5 text-xs font-medium text-label transition-all peer-placeholder-shown:top-5 peer-placeholder-shown:text-base peer-placeholder-shown:font-normal peer-placeholder-shown:text-placeholder peer-focus:top-3.5 peer-focus:text-xs peer-focus:font-medium peer-focus:text-brand"
        >
          {label}
        </label>
      </div>
      {error ? (
        <p className="mt-1.5 text-xs text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
});
