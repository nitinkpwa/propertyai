import { validatePassword } from "@/lib/auth/validation";
import { isValidMobileNumber } from "@/lib/auth/mobile";
import { isValidUsername } from "@/lib/auth/username";

export function validateBuilderRegistration(input: {
  companyName: string;
  builderName: string;
  username: string;
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

  if (!isValidUsername(input.username)) {
    return "Username must be 3–30 characters and use letters, numbers, or underscores only.";
  }

  if (!isValidMobileNumber(input.mobile)) {
    return "Please enter a valid 10-digit mobile number.";
  }

  if (!input.email.trim()) {
    return "Please enter a company email address.";
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
