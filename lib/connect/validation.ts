import { isValidEmail, validatePassword } from "@/lib/auth/validation";
import { isValidMobileNumber } from "@/lib/auth/mobile";

export function validateBuilderRegistration(input: {
  companyName: string;
  builderName: string;
  mobile: string;
  email: string;
  city: string;
  password: string;
  confirmPassword: string;
}): string | null {
  if (!input.companyName.trim()) {
    return "Please enter your company name.";
  }

  if (!input.builderName.trim()) {
    return "Please enter the builder contact name.";
  }

  if (!isValidMobileNumber(input.mobile)) {
    return "Please enter a valid 10-digit mobile number.";
  }

  if (!input.email.trim() || !isValidEmail(input.email)) {
    return "Please enter a valid email address.";
  }

  if (!input.city.trim()) {
    return "Please select your city.";
  }

  const passwordError = validatePassword(input.password);
  if (passwordError) return passwordError;

  if (input.password !== input.confirmPassword) {
    return "Passwords do not match.";
  }

  return null;
}
