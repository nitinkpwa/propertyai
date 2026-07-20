/**
 * Pluggable knowledge modules for AreaIQ Intelligence.
 * Future modules (circle rates, crime, pollution, RERA API, etc.) register here.
 */

export type KnowledgeModuleId =
  | "area"
  | "builder"
  | "investment"
  | "government_projects"
  | "circle_rates"
  | "registry_rates"
  | "crime"
  | "pollution"
  | "traffic"
  | "weather"
  | "schools"
  | "hospitals"
  | "metro"
  | "rental_trends"
  | "future_infrastructure"
  | "rera_api"
  | "google_maps";

export interface KnowledgeModuleDescriptor {
  id: KnowledgeModuleId;
  title: string;
  enabled: boolean;
  /** When false, composer must treat outputs as unavailable */
  implemented: boolean;
}

const MODULES: KnowledgeModuleDescriptor[] = [
  { id: "area", title: "Area Intelligence", enabled: true, implemented: true },
  { id: "builder", title: "Builder Intelligence", enabled: true, implemented: true },
  { id: "investment", title: "Investment Intelligence", enabled: true, implemented: true },
  { id: "government_projects", title: "Government Projects", enabled: false, implemented: false },
  { id: "circle_rates", title: "Circle Rates", enabled: false, implemented: false },
  { id: "registry_rates", title: "Registry Rates", enabled: false, implemented: false },
  { id: "crime", title: "Crime Data", enabled: false, implemented: false },
  { id: "pollution", title: "Pollution", enabled: false, implemented: false },
  { id: "traffic", title: "Traffic", enabled: false, implemented: false },
  { id: "weather", title: "Weather", enabled: false, implemented: false },
  { id: "schools", title: "Schools", enabled: false, implemented: false },
  { id: "hospitals", title: "Hospitals", enabled: false, implemented: false },
  { id: "metro", title: "Metro", enabled: false, implemented: false },
  { id: "rental_trends", title: "Rental Trends", enabled: false, implemented: false },
  { id: "future_infrastructure", title: "Future Infrastructure", enabled: false, implemented: false },
  { id: "rera_api", title: "RERA API", enabled: false, implemented: false },
  { id: "google_maps", title: "Google Maps", enabled: false, implemented: false },
];

export function listKnowledgeModules(): KnowledgeModuleDescriptor[] {
  return MODULES.map((m) => ({ ...m }));
}

export function isModuleActive(id: KnowledgeModuleId): boolean {
  const mod = MODULES.find((m) => m.id === id);
  return Boolean(mod?.enabled && mod.implemented);
}
