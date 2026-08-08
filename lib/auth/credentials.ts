import type { Session, User } from "@supabase/supabase-js";
import { INVALID_CREDENTIALS_MESSAGE } from "@/lib/auth/errors";
import { mobileToAuthEmail, normalizeMobileNumber } from "@/lib/auth/mobile";
import { fetchProfile, upsertProfile } from "@/lib/auth/profile";
import { normalizeUsername } from "@/lib/auth/username";
import type { Profile } from "@/lib/supabase";
import { supabase } from "@/lib/supabase/client";
import type { AccountType } from "@/lib/auth/mobile";

const EMAIL_LIKE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Resolve a login identifier to the Supabase Auth email address. */
export async function resolveLoginAuthEmail(identifier: string): Promise<string | null> {
  const trimmed = identifier.trim();
  if (!trimmed) return null;

  // Synthetic AreaIQ auth mailbox — use as-is.
  if (/^[6-9]\d{9}@areaiq\.app$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  const { data, error } = await supabase.rpc("resolve_login_email", {
    p_identifier: trimmed,
  });

  if (error) {
    console.error("resolve_login_email failed:", error.message);
    const digits = normalizeMobileNumber(trimmed);
    if (/^[6-9]\d{9}$/.test(digits)) {
      return mobileToAuthEmail(digits);
    }
    // Fall through — Dashboard-provisioned admins use a real Auth email that
    // resolve_login_email intentionally does not map (it only maps phone /
    // username / contact_email → phone@areaiq.app).
  } else if (typeof data === "string" && data.includes("@")) {
    return data;
  }

  // Admins (and any Auth users) provisioned with a real mailbox in Supabase
  // Auth cannot be resolved via the phone/username RPC. Allow a direct Auth
  // email attempt — signInWithPassword still enforces credentials.
  // Buyer contact_email that is NOT an Auth mailbox simply fails Auth login.
  if (EMAIL_LIKE.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  return null;
}

/** Official Supabase email + password sign-in. */
export async function signInWithEmailPassword(
  email: string,
  password: string,
): Promise<{ user: User; session: Session; profile: Profile | null }> {
  const normalizedEmail = email.trim().toLowerCase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error || !data.user || !data.session) {
    throw new Error(INVALID_CREDENTIALS_MESSAGE);
  }

  const profile = await fetchProfile(data.user.id);

  if (profile?.role === "buyer") {
    void fetch("/api/crm/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "login" }),
    });
  }

  return { user: data.user, session: data.session, profile };
}

export async function signInWithIdentifier(
  identifier: string,
  password: string,
): Promise<{ user: User; session: Session; profile: Profile | null }> {
  const authEmail = await resolveLoginAuthEmail(identifier);
  if (!authEmail) {
    throw new Error(INVALID_CREDENTIALS_MESSAGE);
  }

  return signInWithEmailPassword(authEmail, password);
}

export async function checkUsernameTaken(username: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("check_username_taken", {
    p_username: normalizeUsername(username),
  });
  if (error) {
    console.error("check_username_taken failed:", error.message);
    return false;
  }
  return Boolean(data);
}

export async function checkPhoneTaken(phone: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("check_phone_taken", {
    p_phone: normalizeMobileNumber(phone),
  });
  if (error) {
    console.error("check_phone_taken failed:", error.message);
    return false;
  }
  return Boolean(data);
}

export async function registerAccount(input: {
  fullName: string;
  username?: string;
  phone: string;
  password: string;
  role: AccountType;
  contactEmail?: string;
}): Promise<{ user: User; session: Session; profile: Profile | null }> {
  if (input.role !== "buyer" && input.role !== "seller") {
    // Builder/connect and admin accounts are provisioned server-side only.
    throw new Error("This account type cannot be created from the public website.");
  }
  const normalizedPhone = normalizeMobileNumber(input.phone);
  const normalizedUsername =
    input.role === "buyer"
      ? normalizeUsername(`buyer_${normalizedPhone}`)
      : normalizeUsername(input.username ?? "");

  if (await checkUsernameTaken(normalizedUsername)) {
    throw new Error("USERNAME_TAKEN");
  }

  if (await checkPhoneTaken(normalizedPhone)) {
    throw new Error("PHONE_TAKEN");
  }

  const authEmail = mobileToAuthEmail(normalizedPhone);
  const { data, error } = await supabase.auth.signUp({
    email: authEmail,
    password: input.password,
    options: {
      data: {
        full_name: input.fullName.trim(),
        username: normalizedUsername,
        role: input.role,
        phone: normalizedPhone,
      },
    },
  });

  if (error) throw error;
  if (!data.user) throw new Error("Registration failed");

  const profile = await upsertProfile({
    user: data.user,
    fullName: input.fullName.trim(),
    username: normalizedUsername,
    role: input.role,
    phone: normalizedPhone,
    contactEmail: input.contactEmail?.trim() || undefined,
  });

  if (data.session) {
    if (input.role === "buyer") {
      void fetch("/api/crm/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "register" }),
      });
    }
    return { user: data.user, session: data.session, profile };
  }

  const signedIn = await signInWithIdentifier(normalizedPhone, input.password);
  if (input.role === "buyer") {
    void fetch("/api/crm/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "register" }),
    });
  }
  return { ...signedIn, profile: signedIn.profile ?? profile };
}

export async function changePassword(input: {
  identifier: string;
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await signInWithIdentifier(input.identifier, input.currentPassword);

  const { error } = await supabase.auth.updateUser({
    password: input.newPassword,
  });

  if (error) throw error;
}
