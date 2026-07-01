import type { User } from "@supabase/supabase-js";
import { formatMobileDisplay, mobileToAuthEmail, normalizeMobileNumber } from "@/lib/auth/mobile";
import { normalizeUsername } from "@/lib/auth/username";
import { supabase, type Profile } from "@/lib/supabase";

export { getDashboardPath } from "@/lib/auth/routes";

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch profile:", error.message);
    return null;
  }

  return data;
}

export async function upsertProfile(input: {
  user: User;
  fullName: string;
  username?: string;
  role?: Profile["role"];
  phone?: string;
}): Promise<Profile | null> {
  const normalizedPhone = input.phone
    ? normalizeMobileNumber(input.phone)
    : (input.user.user_metadata?.phone as string | undefined)
      ? normalizeMobileNumber(String(input.user.user_metadata.phone))
      : "";

  const normalizedUsername = input.username
    ? normalizeUsername(input.username)
    : (input.user.user_metadata?.username as string | undefined)
      ? normalizeUsername(String(input.user.user_metadata.username))
      : "";

  const payload = {
    id: input.user.id,
    email: input.user.email ?? (normalizedPhone ? mobileToAuthEmail(normalizedPhone) : ""),
    full_name: input.fullName.trim(),
    username: normalizedUsername || null,
    phone: normalizedPhone,
    role: input.role ?? (input.user.user_metadata?.role as Profile["role"]) ?? "buyer",
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    console.error("Failed to upsert profile:", error.message);
    return fetchProfile(input.user.id);
  }

  return data;
}

export function getInitials(name?: string | null, fallback?: string | null): string {
  const source = name?.trim() || fallback?.trim() || "U";
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function getProfileDisplayName(profile: Profile | null, user?: User | null): string {
  if (profile?.full_name?.trim()) return profile.full_name.trim();
  if (profile?.username) return profile.username;
  if (profile?.phone) return formatMobileDisplay(profile.phone);
  return user?.user_metadata?.full_name?.trim() || "User";
}

export function getProfileSubtitle(profile: Profile | null): string {
  if (profile?.username) return `@${profile.username}`;
  if (profile?.phone) return formatMobileDisplay(profile.phone);
  return "AreaIQ member";
}

export function getProfileLoginIdentifier(profile: Profile | null): string {
  if (profile?.username) return profile.username;
  if (profile?.phone) return profile.phone;
  return "";
}
