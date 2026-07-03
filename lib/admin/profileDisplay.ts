import { getInitials } from "@/lib/auth/profile";
import type { BuyerProfileForCRM } from "@/lib/crm/buyerProfile";
import type { Profile } from "@/lib/supabase";

export const UNKNOWN_USER = "Unknown User";

/** Minimal profile shape accepted by admin resolvers. */
export type ProfileLike = {
  id?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: Profile["role"] | string | null;
  company?: string | null;
  contact_email?: string | null;
  created_at?: string | null;
  avatar_url?: string | null;
};

export type ResolvedProfile = {
  profileId: string | null;
  displayName: string;
  email: string | null;
  phone: string | null;
  role: Profile["role"] | string | null;
  roleLabel: string;
  initials: string;
  createdAt: string | null;
  hasProfile: boolean;
};

export type ResolveProfileOptions = {
  profileId?: string | null;
  lookup?: Map<string, Profile>;
};

export function buildProfileLookup(profiles: Profile[]): Map<string, Profile> {
  return new Map(profiles.map((profile) => [profile.id, profile]));
}

function pickEmail(profile: ProfileLike | null | undefined): string | null {
  const email = profile?.email?.trim() || profile?.contact_email?.trim();
  return email || null;
}

function pickPhone(profile: ProfileLike | null | undefined): string | null {
  const phone = profile?.phone?.trim();
  return phone || null;
}

/** Display priority: full_name → company → email → phone → Unknown User */
export function resolveDisplayName(profile: ProfileLike | null | undefined): string {
  if (!profile) return UNKNOWN_USER;

  const fullName = profile.full_name?.trim();
  if (fullName) return fullName;

  const company = profile.company?.trim();
  if (company) return company;

  const email = pickEmail(profile);
  if (email) return email;

  const phone = pickPhone(profile);
  if (phone) return phone;

  return UNKNOWN_USER;
}

export function formatRoleLabel(role?: string | null): string {
  switch (role) {
    case "buyer":
      return "Buyer";
    case "seller":
      return "Seller";
    case "builder":
      return "AreaIQ Connect";
    case "admin":
      return "Admin";
    default:
      return role ? role.charAt(0).toUpperCase() + role.slice(1) : "Member";
  }
}

export function roleBadgeClass(role?: string | null): string {
  switch (role) {
    case "buyer":
      return "bg-blue-50 text-blue-700";
    case "seller":
      return "bg-violet-50 text-violet-700";
    case "builder":
      return "bg-amber-50 text-amber-800";
    case "admin":
      return "bg-emerald-50 text-emerald-700";
    default:
      return "bg-neutral-100 text-neutral-600";
  }
}

function mergeProfileSources(
  source: ProfileLike | BuyerProfileForCRM | null | undefined,
  options?: ResolveProfileOptions,
): ProfileLike | null {
  const lookupProfile =
    options?.profileId && options.lookup
      ? options.lookup.get(options.profileId) ?? null
      : null;

  if (!source && !lookupProfile) return null;

  const sourceProfile = source as ProfileLike | null | undefined;

  return {
    ...(lookupProfile ?? {}),
    ...(sourceProfile ?? {}),
    id: sourceProfile?.id ?? lookupProfile?.id ?? options?.profileId ?? null,
    role: sourceProfile?.role ?? lookupProfile?.role ?? null,
    created_at: sourceProfile?.created_at ?? lookupProfile?.created_at ?? null,
  };
}

/** Resolve profile_id → profiles row → display fields for admin UI. */
export function resolveProfileDisplay(
  source: ProfileLike | BuyerProfileForCRM | null | undefined,
  options?: ResolveProfileOptions,
): ResolvedProfile {
  const merged = mergeProfileSources(source, options);
  const displayName = resolveDisplayName(merged);
  const email = pickEmail(merged);
  const phone = pickPhone(merged);
  const role = merged?.role ?? null;

  return {
    profileId: merged?.id ?? options?.profileId ?? null,
    displayName,
    email,
    phone,
    role,
    roleLabel: formatRoleLabel(role),
    initials: getInitials(
      displayName !== UNKNOWN_USER ? displayName : null,
      email ?? phone ?? undefined,
    ),
    createdAt: merged?.created_at ?? null,
    hasProfile: Boolean(merged?.id || displayName !== UNKNOWN_USER),
  };
}

/** Property listings: prefer seller profile, then listing contact fields. */
export function resolvePropertySellerDisplay(
  property: {
    seller_id?: string;
    seller?: ProfileLike | null;
    contact_name?: string | null;
    contact_phone?: string | null;
  },
  lookup?: Map<string, Profile>,
): ResolvedProfile {
  const fromSeller = resolveProfileDisplay(property.seller, {
    profileId: property.seller_id,
    lookup,
  });

  if (fromSeller.displayName !== UNKNOWN_USER) {
    return { ...fromSeller, role: fromSeller.role ?? "seller" };
  }

  return resolveProfileDisplay(
    {
      full_name: property.contact_name,
      phone: property.contact_phone,
      role: "seller",
    },
    { profileId: property.seller_id, lookup },
  );
}

export function profileMatchesSearch(
  resolved: ResolvedProfile,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  return (
    resolved.displayName.toLowerCase().includes(q) ||
    (resolved.email?.toLowerCase().includes(q) ?? false) ||
    (resolved.phone?.includes(q) ?? false) ||
    resolved.roleLabel.toLowerCase().includes(q)
  );
}
