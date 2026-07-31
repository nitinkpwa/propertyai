import {
  expandLocations,
  isLocationRelevant,
  resolvePlaceFromQuery,
  scoreLocationMatch,
} from "../lib/location";

const queries = [
  "Kharar me flat",
  "Kurali flat",
  "Flat near Chandigarh Highway",
  "Property near NH21",
  "3 BHK Kharar",
  "Investment near Kharar",
  "Mohali plot",
  "Airport Road property",
  "Aerocity flats",
];

const samples = [
  { title: "The Antillia", location: "Kurali–Chandigarh Highway", city: "Mohali" },
  { title: "NH Project", location: "NH-21", city: "Mohali" },
  { title: "Sunny", location: "Sunny Enclave", city: "Kharar" },
  { title: "IT Tower", location: "IT City", city: "Mohali" },
  { title: "Aero Flat", location: "Aerocity", city: "Mohali" },
  { title: "Wave", location: "Airport Road", city: "Mohali" },
];

let failed = 0;
for (const q of queries) {
  const place = resolvePlaceFromQuery(q);
  console.log("---", q);
  if (!place) {
    console.log("FAIL: unresolved");
    failed++;
    continue;
  }
  console.log("resolved:", place.displayName, "| kind:", place.kind);
  console.log("expanded:", expandLocations(place).slice(0, 12).join(", "));
  const hits = samples
    .map((s) => ({ s, sc: scoreLocationMatch(s, place) }))
    .filter((x) => isLocationRelevant(x.sc, { minScore: 55, maxDistanceKm: 25 }));
  console.log(
    "hits:",
    hits.length
      ? hits.map((h) => `${h.s.location}@${h.sc.matchScore}/${h.sc.tier}`).join(", ")
      : "NONE",
  );
  if (hits.length === 0) {
    console.log("FAIL: expected at least one sample hit");
    failed++;
  }
}

process.exit(failed ? 1 : 0);
