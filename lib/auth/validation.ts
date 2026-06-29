import { isValidMobileNumber } from "@/lib/auth/mobile";
import type { AccountType } from "@/lib/auth/mobile";

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Password must include at least one letter and one number.";
  }

  return null;
}

export function validateRegistration(input: {
  fullName: string;
  mobile: string;
  password: string;
  confirmPassword: string;
  accountType: AccountType;
}): string | null {
  if (!input.fullName.trim()) {
    return "Please enter your full name.";
  }

  if (!isValidMobileNumber(input.mobile)) {
    return "Please enter a valid 10-digit mobile number.";
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
  mobile: string;
  password: string;
}): string | null {
  if (!isValidMobileNumber(input.mobile)) {
    return "Please enter a valid 10-digit mobile number.";
  }

  if (!input.password) {
    return "Please enter your password.";
  }

  return null;
}
