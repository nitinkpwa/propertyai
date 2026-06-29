export type ConnectTab =
  | "home"
  | "projects"
  | "inventory"
  | "leads"
  | "partners"
  | "visits"
  | "analytics"
  | "documents"
  | "profile"
  | "notifications";

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
