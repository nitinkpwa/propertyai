import type { AccountType } from "@/lib/auth/mobile";
import { isValidMobileNumber } from "@/lib/auth/mobile";
import { isValidUsername } from "@/lib/auth/username";

export function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  return null;
}

export type LoginFieldErrors = {
  identifier?: string;
  password?: string;
};

export type RegistrationFieldErrors = {
  fullName?: string;
  username?: string;
  mobile?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  accountType?: string;
};

/** Field-level login validation — errors attach under the correct input. */
export function validateLoginFields(input: {
  identifier: string;
  password: string;
}): LoginFieldErrors {
  const errors: LoginFieldErrors = {};

  if (!input.identifier.trim()) {
    errors.identifier = "Please enter your email, username, or phone number.";
  }

  if (!input.password) {
    errors.password = "Please enter your password.";
  }

  return errors;
}

/** Field-level registration validation — errors attach under the correct input. */
export function validateRegistrationFields(input: {
  fullName: string;
  username?: string;
  mobile: string;
  password: string;
  confirmPassword: string;
  accountType: AccountType;
  email?: string;
}): RegistrationFieldErrors {
  const errors: RegistrationFieldErrors = {};
  const isBuyer = input.accountType === "buyer";

  if (!input.fullName.trim()) {
    errors.fullName = "Please enter your full name.";
  }

  if (!isBuyer) {
    if (!input.username || !isValidUsername(input.username)) {
      errors.username =
        "Username must be 3–30 characters and use letters, numbers, or underscores only.";
    }
  }

  if (!isValidMobileNumber(input.mobile)) {
    errors.mobile = "Please enter a valid 10-digit mobile number.";
  }

  if (input.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    errors.email = "Please enter a valid email address.";
  }

  const passwordError = validatePassword(input.password);
  if (passwordError) {
    errors.password = passwordError;
  }

  if (!input.confirmPassword) {
    errors.confirmPassword = "Please confirm your password.";
  } else if (input.password !== input.confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  if (!input.accountType) {
    errors.accountType = "Please select an account type.";
  }

  return errors;
}

export function hasFieldErrors(errors: Record<string, string | undefined>): boolean {
  return Object.values(errors).some(Boolean);
}

/** Scroll the first invalid field into view and focus it (mobile keyboard-safe). */
export function focusFirstFieldError(
  errors: Record<string, string | undefined>,
  fieldOrder: string[],
): void {
  if (typeof document === "undefined") return;
  for (const key of fieldOrder) {
    if (!errors[key]) continue;
    const el = document.querySelector<HTMLElement>(`[data-field="${key}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const input = el.matches("input,textarea,select")
        ? el
        : el.querySelector<HTMLElement>("input,textarea,select");
      input?.focus({ preventScroll: true });
      return;
    }
  }
}

/** @deprecated Prefer validateLoginFields for per-field placement */
export function validateLogin(input: {
  identifier: string;
  password: string;
}): string | null {
  const errors = validateLoginFields(input);
  return errors.identifier ?? errors.password ?? null;
}

/** @deprecated Prefer validateRegistrationFields for per-field placement */
export function validateRegistration(input: {
  fullName: string;
  username?: string;
  mobile: string;
  password: string;
  confirmPassword: string;
  accountType: AccountType;
  email?: string;
}): string | null {
  const errors = validateRegistrationFields(input);
  return (
    errors.fullName ??
    errors.username ??
    errors.mobile ??
    errors.email ??
    errors.password ??
    errors.confirmPassword ??
    errors.accountType ??
    null
  );
}

export function validatePasswordChange(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): string | null {
  if (!input.currentPassword) {
    return "Please enter your current password.";
  }

  const passwordError = validatePassword(input.newPassword);
  if (passwordError) return passwordError;

  if (input.newPassword !== input.confirmPassword) {
    return "New passwords do not match.";
  }

  if (input.currentPassword === input.newPassword) {
    return "Choose a password that is different from your current one.";
  }

  return null;
}
