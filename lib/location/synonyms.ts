/**
 * Tricity location synonym / expansion graph.
 * Every locality expands into nearby corridors, highways, and micro-markets.
 */

import type { PlaceNode } from "./types";

export const PLACE_GRAPH: PlaceNode[] = [
  // ── Kharar belt ──────────────────────────────────────────────
  {
    id: "kharar",
    displayName: "Kharar",
    kind: "city",
    aliases: ["kharar", "kharad", "greater kharar"],
    nearby: [
      "Kurali",
      "Kurali Highway",
      "NH-21",
      "Chandigarh Highway",
      "Sunny Enclave",
      "Greater Mohali",
      "Landran Road",
      "New Chandigarh Belt",
      "TDI City",
      "Sector 123",
      "Sector 125",
    ],
    parentCity: "Mohali",
    lat: 30.7497,
    lng: 76.6469,
  },
  {
    id: "kurali",
    displayName: "Kurali",
    kind: "locality",
    aliases: ["kurali", "kurali town"],
    nearby: [
      "Kharar",
      "Kurali Highway",
      "NH-21",
      "Chandigarh Highway",
      "New Chandigarh",
      "Morinda",
    ],
    parentCity: "Mohali",
    lat: 30.834,
    lng: 76.58,
  },
  {
    id: "kurali-highway",
    displayName: "Kurali Highway",
    kind: "highway",
    aliases: [
      "kurali highway",
      "kurali-chandigarh highway",
      "kurali chandigarh highway",
      "kurali–chandigarh highway",
      "kurali - chandigarh highway",
    ],
    nearby: ["Kharar", "Kurali", "NH-21", "Chandigarh Highway", "New Chandigarh Belt"],
    parentCity: "Mohali",
    lat: 30.79,
    lng: 76.61,
  },
  {
    id: "nh-21",
    displayName: "NH-21",
    kind: "highway",
    aliases: ["nh-21", "nh21", "nh 21", "national highway 21", "nh-21 highway"],
    nearby: ["Kharar", "Kurali", "Kurali Highway", "Chandigarh Highway", "Ropar Road"],
    parentCity: "Mohali",
    lat: 30.78,
    lng: 76.62,
  },
  {
    id: "chandigarh-highway",
    displayName: "Chandigarh Highway",
    kind: "highway",
    aliases: [
      "chandigarh highway",
      "chd highway",
      "chandigarh road",
      "kharar chandigarh highway",
    ],
    nearby: ["Kharar", "Kurali Highway", "NH-21", "Sunny Enclave", "New Chandigarh Belt"],
    parentCity: "Mohali",
    lat: 30.76,
    lng: 76.65,
  },
  {
    id: "sunny-enclave",
    displayName: "Sunny Enclave",
    kind: "micromarket",
    aliases: ["sunny enclave", "sunny enclave kharar", "sunny enclave mohali"],
    nearby: ["Kharar", "Chandigarh Highway", "Greater Mohali", "Sector 125"],
    parentCity: "Mohali",
    lat: 30.755,
    lng: 76.66,
  },
  {
    id: "greater-mohali",
    displayName: "Greater Mohali",
    kind: "district",
    aliases: ["greater mohali", "gmada", "greater mohali area"],
    nearby: ["Kharar", "Mohali", "New Chandigarh", "Airport Road", "Landran"],
    parentCity: "Mohali",
    lat: 30.72,
    lng: 76.7,
  },
  {
    id: "landran-road",
    displayName: "Landran Road",
    kind: "corridor",
    aliases: ["landran road", "landran", "landran chowk"],
    nearby: ["Kharar", "Mohali", "Sector 115", "Sector 116", "IT City"],
    parentCity: "Mohali",
    lat: 30.69,
    lng: 76.66,
  },
  {
    id: "new-chandigarh-belt",
    displayName: "New Chandigarh Belt",
    kind: "corridor",
    aliases: [
      "new chandigarh belt",
      "new chandigarh",
      "mullanpur",
      "mullanpur garibdass",
      "eco city",
      "medi city",
    ],
    nearby: ["Kharar", "Kurali", "NH-21", "Chandigarh Highway", "Omaxe New Chandigarh"],
    parentCity: "New Chandigarh",
    lat: 30.82,
    lng: 76.7,
  },
  {
    id: "tdi-city",
    displayName: "TDI City",
    kind: "micromarket",
    aliases: ["tdi city", "tdi", "tdi sector"],
    nearby: ["Kharar", "New Chandigarh", "Sector 110", "Sector 117"],
    parentCity: "Mohali",
    lat: 30.77,
    lng: 76.69,
  },

  // ── Mohali ───────────────────────────────────────────────────
  {
    id: "mohali",
    displayName: "Mohali",
    kind: "city",
    aliases: ["mohali", "sas nagar", "s.a.s. nagar", "sasnagar", "sahibzada ajit singh nagar"],
    nearby: [
      "Sector 66",
      "Sector 67",
      "Sector 68",
      "Sector 69",
      "Sector 70",
      "Sector 71",
      "Sector 74",
      "Sector 75",
      "Sector 76",
      "Sector 77",
      "Sector 78",
      "Sector 79",
      "Sector 80",
      "Sector 82",
      "Sector 85",
      "Sector 88",
      "Sector 89",
      "Airport Road",
      "IT City",
      "JLPL",
      "Aerocity",
      "Wave Estate",
      "Sector Road",
      "Kharar",
      "Landran",
    ],
    parentCity: "Mohali",
    lat: 30.7046,
    lng: 76.7179,
  },
  {
    id: "airport-road",
    displayName: "Airport Road",
    kind: "corridor",
    aliases: ["airport road", "airport rd", "mohali airport road", "chd airport road"],
    nearby: ["Aerocity", "IT City", "JLPL", "Mohali", "Wave Estate", "PR7"],
    parentCity: "Mohali",
    lat: 30.68,
    lng: 76.76,
  },
  {
    id: "it-city",
    displayName: "IT City",
    kind: "micromarket",
    aliases: ["it city", "it city mohali", "infotech city"],
    nearby: ["Airport Road", "Aerocity", "JLPL", "Sector 82", "Sector 83", "Mohali"],
    parentCity: "Mohali",
    lat: 30.675,
    lng: 76.745,
  },
  {
    id: "jlpl",
    displayName: "JLPL",
    kind: "micromarket",
    aliases: ["jlpl", "jlpl industrial area", "j.l.p.l"],
    nearby: ["IT City", "Airport Road", "Aerocity", "Sector 82", "Mohali"],
    parentCity: "Mohali",
    lat: 30.67,
    lng: 76.74,
  },
  {
    id: "aerocity",
    displayName: "Aerocity",
    kind: "micromarket",
    aliases: ["aerocity", "aero city", "aerocity mohali", "aero-city"],
    nearby: ["Airport Road", "IT City", "JLPL", "PR7", "Wave Estate", "Mohali", "Zirakpur"],
    parentCity: "Mohali",
    lat: 30.665,
    lng: 76.785,
  },
  {
    id: "wave-estate",
    displayName: "Wave Estate",
    kind: "micromarket",
    aliases: ["wave estate", "wave", "wave city"],
    nearby: ["Aerocity", "Airport Road", "Sector 85", "Mohali"],
    parentCity: "Mohali",
    lat: 30.69,
    lng: 76.75,
  },
  {
    id: "sector-road",
    displayName: "Sector Road",
    kind: "corridor",
    aliases: ["sector road", "sector rd"],
    nearby: ["Mohali", "Sector 66", "Sector 67", "Sector 70"],
    parentCity: "Mohali",
    lat: 30.7,
    lng: 76.72,
  },

  // ── Zirakpur ─────────────────────────────────────────────────
  {
    id: "zirakpur",
    displayName: "Zirakpur",
    kind: "city",
    aliases: ["zirakpur", "zeerakpur", "zirakpur chandigarh"],
    nearby: [
      "VIP Road",
      "Patiala Road",
      "PR7",
      "Peer Muchalla",
      "Dhakoli",
      "Gazipur",
      "Baltana",
      "Aerocity",
    ],
    parentCity: "Zirakpur",
    lat: 30.6425,
    lng: 76.8173,
  },
  {
    id: "vip-road",
    displayName: "VIP Road",
    kind: "highway",
    aliases: ["vip road", "vip rd", "zirakpur vip road"],
    nearby: ["Zirakpur", "Patiala Road", "Peer Muchalla", "Gazipur"],
    parentCity: "Zirakpur",
    lat: 30.645,
    lng: 76.82,
  },
  {
    id: "patiala-road",
    displayName: "Patiala Road",
    kind: "highway",
    aliases: ["patiala road", "patiala rd", "nh-7", "nh7"],
    nearby: ["Zirakpur", "VIP Road", "Dhakoli", "Banur"],
    parentCity: "Zirakpur",
    lat: 30.63,
    lng: 76.83,
  },
  {
    id: "pr7",
    displayName: "PR7",
    kind: "corridor",
    aliases: ["pr7", "pr-7", "pr 7", "pr7 road"],
    nearby: ["Aerocity", "Zirakpur", "Airport Road", "Gazipur"],
    parentCity: "Mohali",
    lat: 30.655,
    lng: 76.8,
  },
  {
    id: "peer-muchalla",
    displayName: "Peer Muchalla",
    kind: "locality",
    aliases: ["peer muchalla", "peermuchalla", "peer muchala"],
    nearby: ["Zirakpur", "VIP Road", "Dhakoli", "Gazipur"],
    parentCity: "Zirakpur",
    lat: 30.655,
    lng: 76.84,
  },
  {
    id: "dhakoli",
    displayName: "Dhakoli",
    kind: "locality",
    aliases: ["dhakoli", "dhakkoli"],
    nearby: ["Zirakpur", "Patiala Road", "Peer Muchalla", "Baltana"],
    parentCity: "Zirakpur",
    lat: 30.635,
    lng: 76.85,
  },

  // ── Core cities ──────────────────────────────────────────────
  {
    id: "chandigarh",
    displayName: "Chandigarh",
    kind: "city",
    aliases: ["chandigarh", "chd", "chandigarh city", "ut chandigarh"],
    nearby: ["Mohali", "Panchkula", "Zirakpur", "Manimajra", "Industrial Area"],
    parentCity: "Chandigarh",
    lat: 30.7333,
    lng: 76.7794,
  },
  {
    id: "panchkula",
    displayName: "Panchkula",
    kind: "city",
    aliases: ["panchkula", "pkul", "panchkula haryana"],
    nearby: ["Chandigarh", "Zirakpur", "Pinjore", "Kalka"],
    parentCity: "Panchkula",
    lat: 30.6942,
    lng: 76.8606,
  },
  {
    id: "new-chandigarh",
    displayName: "New Chandigarh",
    kind: "city",
    aliases: ["new chandigarh", "new chd"],
    nearby: ["New Chandigarh Belt", "Kharar", "Kurali", "Mullanpur", "Eco City"],
    parentCity: "New Chandigarh",
    lat: 30.82,
    lng: 76.7,
  },
  {
    id: "derabassi",
    displayName: "Derabassi",
    kind: "city",
    aliases: ["derabassi", "dera bassi", "derabasi"],
    nearby: ["Zirakpur", "Airport Road", "Banur", "Barwala"],
    parentCity: "Derabassi",
    lat: 30.585,
    lng: 76.845,
  },
  {
    id: "banur",
    displayName: "Banur",
    kind: "city",
    aliases: ["banur", "banur town"],
    nearby: ["Derabassi", "Patiala Road", "Rajpura"],
    parentCity: "Banur",
    lat: 30.555,
    lng: 76.72,
  },
];

/** Mohali sectors 66–89 as individual searchable nodes. */
const MOHALI_SECTORS = [
  66, 67, 68, 69, 70, 71, 74, 75, 76, 77, 78, 79, 80, 82, 85, 88, 89, 115, 116,
  117, 118, 123, 125,
];

for (const n of MOHALI_SECTORS) {
  PLACE_GRAPH.push({
    id: `sector-${n}`,
    displayName: `Sector ${n}`,
    kind: "sector",
    aliases: [`sector ${n}`, `sec ${n}`, `sec. ${n}`, `s${n}`, `sector-${n}`],
    nearby: ["Mohali", "Airport Road", "IT City"],
    parentCity: "Mohali",
    lat: 30.7 + (n - 70) * 0.002,
    lng: 76.72 + (n - 70) * 0.002,
  });
}

const byId = new Map(PLACE_GRAPH.map((p) => [p.id, p]));
const byAlias = new Map<string, PlaceNode>();

function normAlias(s: string): string {
  return s
    .toLowerCase()
    .replace(/[–—−]/g, "-")
    .replace(/[^a-z0-9\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

for (const place of PLACE_GRAPH) {
  byAlias.set(normAlias(place.displayName), place);
  for (const a of place.aliases) {
    byAlias.set(normAlias(a), place);
  }
}

export function normalizePlaceToken(s: string): string {
  return normAlias(s);
}

export function getPlaceById(id: string): PlaceNode | undefined {
  return byId.get(id);
}

export function getPlaceByAlias(token: string): PlaceNode | undefined {
  return byAlias.get(normAlias(token));
}

/** All alias keys sorted longest-first for greedy query scanning. */
export const ALL_ALIAS_KEYS: string[] = [...byAlias.keys()].sort(
  (a, b) => b.length - a.length,
);

export function resolveNearbyNodes(place: PlaceNode): PlaceNode[] {
  const out: PlaceNode[] = [];
  const seen = new Set<string>([place.id]);
  for (const name of place.nearby) {
    const node = getPlaceByAlias(name) ?? getPlaceById(normalizePlaceToken(name));
    if (node && !seen.has(node.id)) {
      seen.add(node.id);
      out.push(node);
    }
  }
  return out;
}
