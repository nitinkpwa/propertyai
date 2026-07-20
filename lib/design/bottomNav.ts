export type BottomNavIcon =
  | "home"
  | "search"
  | "ai"
  | "saved"
  | "profile"
  | "dashboard"
  | "properties"
  | "leads"
  | "visits"
  | "menu"
  | "listings"
  | "add"
  | "pipeline"
  | "bell";

export type BottomNavItem = {
  id: string;
  label: string;
  icon: BottomNavIcon;
  href?: string;
  /** Tab key for SPA dashboards */
  tab?: string;
  /** Opens overflow menu sheet */
  action?: "menu";
  badge?: number;
};

/** Guest / public bottom nav — Home · Search · AI · Saved · Profile */
export const PUBLIC_BOTTOM_NAV: BottomNavItem[] = [
  { id: "home", label: "Home", icon: "home", href: "/" },
  { id: "search", label: "Search", icon: "search", href: "/properties" },
  { id: "ai", label: "AI", icon: "ai", href: "/ask" },
  { id: "saved", label: "Saved", icon: "saved", href: "/buyer/saved" },
  { id: "profile", label: "Profile", icon: "profile", href: "/buyer/profile" },
];

/** Admin — Dashboard · Properties · Leads · Visits · Menu */
export const ADMIN_BOTTOM_NAV: BottomNavItem[] = [
  { id: "dashboard", label: "Home", icon: "dashboard", tab: "dashboard" },
  { id: "properties", label: "Properties", icon: "properties", tab: "properties" },
  { id: "leads", label: "Leads", icon: "leads", tab: "leads" },
  { id: "visits", label: "Visits", icon: "visits", tab: "visits" },
  { id: "menu", label: "Menu", icon: "menu", action: "menu" },
];

/** Seller — Dashboard · Listings · Add · Leads · Profile */
export const SELLER_BOTTOM_NAV: BottomNavItem[] = [
  { id: "home", label: "Home", icon: "dashboard", tab: "home" },
  { id: "listings", label: "Listings", icon: "listings", tab: "listings" },
  { id: "add", label: "Add", icon: "add", tab: "add" },
  { id: "leads", label: "Leads", icon: "leads", tab: "leads" },
  { id: "profile", label: "Profile", icon: "profile", tab: "profile" },
];

/** Connect — Dashboard · Properties · Pipeline · Visits · Menu */
export const CONNECT_BOTTOM_NAV: BottomNavItem[] = [
  { id: "home", label: "Home", icon: "dashboard", tab: "home" },
  { id: "properties", label: "Properties", icon: "properties", tab: "properties" },
  { id: "pipeline", label: "Pipeline", icon: "pipeline", tab: "pipeline" },
  { id: "visits", label: "Visits", icon: "visits", tab: "visits" },
  { id: "menu", label: "Menu", icon: "menu", action: "menu" },
];

/** Buyer portal — Dashboard · Saved · AI · Visits · Profile */
export const BUYER_BOTTOM_NAV: BottomNavItem[] = [
  { id: "dashboard", label: "Home", icon: "dashboard", href: "/buyer" },
  { id: "saved", label: "Saved", icon: "saved", href: "/buyer/saved" },
  { id: "ai", label: "AI", icon: "ai", href: "/ask" },
  { id: "visits", label: "Visits", icon: "visits", href: "/buyer/site-visits" },
  { id: "profile", label: "Profile", icon: "profile", href: "/buyer/profile" },
];

/** Paths where global desktop Navbar should hide on mobile (portals use own chrome) */
export const PORTAL_PREFIXES = [
  "/admin",
  "/seller",
  "/buyer",
  "/connect/dashboard",
] as const;

export function isPortalPath(pathname: string): boolean {
  return PORTAL_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}
