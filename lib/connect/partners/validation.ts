import { validatePassword } from "@/lib/auth/validation";
import { isValidMobileNumber } from "@/lib/auth/mobile";
import type { ConnectPartnerStatus } from "@/lib/connect/partners/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_STATUSES: ConnectPartnerStatus[] = [
  "pending",
  "active",
  "suspended",
  "archived",
];

export function validateCreateConnectPartner(input: {
  companyName: string;
  managerName: string;
  phone: string;
  email: string;
  password: string;
  status?: string;
}): string | null {
  if (!input.companyName.trim()) return "Company name is required.";
  if (!input.managerName.trim()) return "Manager name is required.";

  if (!isValidMobileNumber(input.phone)) {
    return "Please enter a valid 10-digit mobile number.";
  }

  if (!input.email.trim() || !EMAIL_RE.test(input.email.trim())) {
    return "Please enter a valid email address.";
  }

  const passwordError = validatePassword(input.password);
  if (passwordError) return passwordError;

  if (input.status && !VALID_STATUSES.includes(input.status as ConnectPartnerStatus)) {
    return "Invalid partner status.";
  }

  return null;
}

export function validateUpdateConnectPartner(input: {
  companyName?: string;
  managerName?: string;
  phone?: string;
  email?: string;
  status?: string;
}): string | null {
  if (input.companyName !== undefined && !input.companyName.trim()) {
    return "Company name cannot be empty.";
  }
  if (input.managerName !== undefined && !input.managerName.trim()) {
    return "Manager name cannot be empty.";
  }
  if (input.phone !== undefined && !isValidMobileNumber(input.phone)) {
    return "Please enter a valid 10-digit mobile number.";
  }
  if (input.email !== undefined && (!input.email.trim() || !EMAIL_RE.test(input.email.trim()))) {
    return "Please enter a valid email address.";
  }
  if (input.status && !VALID_STATUSES.includes(input.status as ConnectPartnerStatus)) {
    return "Invalid partner status.";
  }
  return null;
}
