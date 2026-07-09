export type ConnectTab =
  | "home"
  | "properties"
  | "leads"
  | "pipeline"
  | "visits"
  | "activities"
  | "documents"
  | "analytics"
  | "notifications"
  | "settings"
  | "support";

/** @deprecated Use "leads" — kept for migration */
export type LegacyConnectTab = ConnectTab | "buyers" | "projects";

export interface ConnectLandingStats {
  propertiesListed: number;
  builders: number;
  projects: number;
  cities: number;
  monthlyBuyerLeads: number;
}

export interface ConnectDashboardStats {
  projects: number;
  inventoryUnits: number;
  newLeads: number;
  channelPartners: number;
  siteVisits: number;
  documents: number;
  propertiesListed: number;
  totalLeads: number;
}

export const CONNECT_NAV: Array<{ key: ConnectTab; label: string; icon: string }> = [
  { key: "home", label: "Dashboard", icon: "📊" },
  { key: "properties", label: "Assigned Properties", icon: "🏠" },
  { key: "leads", label: "Property Leads", icon: "👤" },
  { key: "pipeline", label: "Pipeline", icon: "📋" },
  { key: "visits", label: "Site Visits", icon: "📅" },
  { key: "activities", label: "Activities", icon: "⚡" },
  { key: "documents", label: "Documents", icon: "📄" },
  { key: "analytics", label: "Analytics", icon: "📈" },
  { key: "notifications", label: "Notifications", icon: "🔔" },
  { key: "settings", label: "Settings", icon: "⚙️" },
  { key: "support", label: "Support", icon: "💬" },
];
