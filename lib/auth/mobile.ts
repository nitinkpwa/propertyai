import type { Profile } from "@/lib/supabase";

export const AUTH_EMAIL_DOMAIN = "areaiq.app";

export type AccountType = Extract<Profile["role"], "buyer" | "seller">;

/** Strip to digits; normalize Indian numbers to 10-digit local form. */
export function normalizeMobileNumber(mobile: string): string {
  const digits = mobile.replace(/\D/g, "");

  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }

  return digits;
}

/** Hidden Supabase Auth email derived from mobile number. */
export function mobileToAuthEmail(mobile: string): string {
  return `${normalizeMobileNumber(mobile)}@${AUTH_EMAIL_DOMAIN}`;
}

export function isValidMobileNumber(mobile: string): boolean {
  const normalized = normalizeMobileNumber(mobile);
  return /^[6-9]\d{9}$/.test(normalized);
}

export function formatMobileDisplay(mobile: string): string {
  const normalized = normalizeMobileNumber(mobile);
  if (normalized.length !== 10) return mobile.trim();
  return `${normalized.slice(0, 5)} ${normalized.slice(5)}`;
}
