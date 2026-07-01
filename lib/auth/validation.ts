import type { AccountType } from "@/lib/auth/mobile";
import { isValidMobileNumber } from "@/lib/auth/mobile";
import { isValidUsername } from "@/lib/auth/username";

export function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  return null;
}

export function validateRegistration(input: {
  fullName: string;
  username?: string;
  mobile: string;
  password: string;
  confirmPassword: string;
  accountType: AccountType;
  email?: string;
}): string | null {
  if (!input.fullName.trim()) {
    return "Please enter your full name.";
  }

  const isBuyer = input.accountType === "buyer";

  if (!isBuyer) {
    if (!input.username || !isValidUsername(input.username)) {
      return "Username must be 3–30 characters and use letters, numbers, or underscores only.";
    }
  }

  if (!isValidMobileNumber(input.mobile)) {
    return "Please enter a valid 10-digit mobile number.";
  }

  if (input.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    return "Please enter a valid email address.";
  }

  const passwordError = validatePassword(input.password);
  if (passwordError) return passwordError;

  if (input.password !== input.confirmPassword) {
    return "Passwords do not match.";
  }

  if (!input.accountType) {
    return "Please select an account type.";
  }

  return null;
}

export function validateLogin(input: {
  identifier: string;
  password: string;
}): string | null {
  if (!input.identifier.trim()) {
    return "Please enter your username or phone number.";
  }

  if (!input.password) {
    return "Please enter your password.";
  }

  return null;
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
