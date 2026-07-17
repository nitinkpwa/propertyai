import { isAdminRole } from "@/lib/auth/admin";
import { getDashboardPath } from "@/lib/auth/routes";
import type { Profile } from "@/lib/supabase";

export type MobileNavItem = {
  id: string;
  label: string;
  href?: string;
  icon?: string;
  /** Visually emphasized primary destination (Dashboard). */
  highlight?: boolean;
  action?: "logout";
};

export function getRoleDisplayLabel(
  role?: Profile["role"] | string | null,
): string {
  if (isAdminRole(role)) return "Admin";
  switch (role) {
    case "seller":
      return "Seller";
    case "builder":
      return "Connect Partner";
    case "buyer":
      return "Buyer";
    default:
      return "Guest";
  }
}

const GUEST_ITEMS: MobileNavItem[] = [
  { id: "home", label: "Home", href: "/" },
  { id: "explore", label: "Explore", href: "/properties?type=buy" },
  { id: "ask", label: "AreaIQ Intelligence", href: "/ask" },
  { id: "properties", label: "Properties", href: "/properties" },
  { id: "insights", label: "Market Intelligence", href: "/ask?q=Latest+Tricity+market+insights" },
  { id: "connect", label: "Connect", href: "/connect" },
  { id: "list", label: "List Property", href: "/seller" },
  { id: "signin", label: "Sign In", href: "/login" },
  { id: "register", label: "Create Account", href: "/register" },
];

/** Role-aware mobile menu. Desktop nav is unchanged elsewhere. */
export function getMobileNavItems(
  role?: Profile["role"] | string | null,
): MobileNavItem[] {
  if (!role) return GUEST_ITEMS;

  if (isAdminRole(role)) {
    return [
      {
        id: "dashboard",
        label: "Admin Dashboard",
        href: getDashboardPath(role),
        icon: "📊",
        highlight: true,
      },
      { id: "properties", label: "Properties", href: "/admin?tab=properties" },
      { id: "users", label: "Users", href: "/admin?tab=users" },
      { id: "connect", label: "Connect", href: "/admin?tab=builders" },
      { id: "analytics", label: "Analytics", href: "/admin?tab=analytics" },
      { id: "logout", label: "Logout", action: "logout" },
    ];
  }

  if (role === "seller") {
    return [
      {
        id: "dashboard",
        label: "Dashboard",
        href: getDashboardPath(role),
        icon: "📊",
        highlight: true,
      },
      { id: "listings", label: "My Properties", href: "/seller?tab=listings" },
      { id: "leads", label: "Leads", href: "/seller?tab=leads" },
      { id: "visits", label: "Site Visits", href: "/seller?tab=visits" },
      { id: "analytics", label: "Analytics", href: "/seller?tab=analytics" },
      { id: "profile", label: "Profile", href: "/seller?tab=profile" },
      { id: "home", label: "Home", href: "/" },
      { id: "ask", label: "AreaIQ Intelligence", href: "/ask" },
      { id: "logout", label: "Logout", action: "logout" },
    ];
  }

  if (role === "builder") {
    return [
      {
        id: "dashboard",
        label: "Dashboard",
        href: getDashboardPath(role),
        icon: "📊",
        highlight: true,
      },
      {
        id: "properties",
        label: "Assigned Properties",
        href: "/connect/dashboard?tab=properties",
      },
      {
        id: "leads",
        label: "Buyer Leads",
        href: "/connect/dashboard?tab=leads",
      },
      {
        id: "visits",
        label: "Site Visits",
        href: "/connect/dashboard?tab=visits",
      },
      { id: "crm", label: "CRM", href: "/connect/dashboard?tab=pipeline" },
      {
        id: "analytics",
        label: "Analytics",
        href: "/connect/dashboard?tab=analytics",
      },
      {
        id: "profile",
        label: "Profile",
        href: "/connect/dashboard?tab=settings",
      },
      { id: "logout", label: "Logout", action: "logout" },
    ];
  }

  // Buyer (default authenticated role)
  return [
    {
      id: "dashboard",
      label: "Dashboard",
      href: getDashboardPath("buyer"),
      icon: "📊",
      highlight: true,
    },
    { id: "saved", label: "Saved Properties", href: "/buyer/saved" },
    { id: "visits", label: "Site Visits", href: "/buyer/site-visits" },
    { id: "chats", label: "Intelligence", href: "/ask" },
    { id: "notifications", label: "Notifications", href: "/buyer/notifications" },
    { id: "home", label: "Home", href: "/" },
    { id: "explore", label: "Explore", href: "/properties?type=buy" },
    { id: "ask", label: "AreaIQ Intelligence", href: "/ask" },
    { id: "properties", label: "Properties", href: "/properties" },
    {
      id: "insights",
      label: "Insights",
      href: "/ask?q=Latest+Tricity+market+insights",
    },
    { id: "connect", label: "Connect", href: "/connect" },
    { id: "profile", label: "Profile", href: "/buyer/profile" },
    { id: "logout", label: "Logout", action: "logout" },
  ];
}
