// ─── DATASET CONTRACT ────────────────────────────────────────────────────────
// NeighborhoodData is the shape every dataset entry must satisfy.
// When real data replaces the LA demo below, each record should conform to this
// interface. The `scores` block can be extended with additional factors —
// just mirror any new keys in the Weights interface and FACTOR_LABELS map.
//
// Geometry is supplied by the GeoJSON file (frontend/public/la-neighborhoods.geojson).
// Score records are joined to GeoJSON features by matching `name` at runtime.
// Neighborhoods in the GeoJSON with no score record default to pillowIndex: 50.
export interface NeighborhoodData {
  id: string;
  name: string;   // Must match the `name` property in la-neighborhoods.geojson exactly
  zip: string;
  scores: {
    price: number;
    walkability: number;
    traffic: number;
    transit: number;
    environmentalRisks: number;
    noisePollution: number;
    airQuality: number;
  };
}

export type ScoreFactor = keyof NeighborhoodData["scores"];

export const FACTOR_LABELS: Record<ScoreFactor, string> = {
  price: "Price",
  walkability: "Walkability",
  traffic: "Traffic",
  transit: "Transit Access",
  environmentalRisks: "Env. Risks",
  noisePollution: "Noise Pollution",
  airQuality: "Air Quality",
};

export const FACTOR_DESCRIPTIONS: Record<ScoreFactor, string> = {
  price: "Affordability of housing in the area",
  walkability: "How walkable is the neighborhood",
  traffic: "Traffic congestion levels (higher = less traffic)",
  transit: "Access to public transportation",
  environmentalRisks: "Safety from floods, fires, earthquakes",
  noisePollution: "Noise levels (higher = quieter)",
  airQuality: "Air quality index score",
};

// ─── LA DEMO DATA ────────────────────────────────────────────────────────────
// Score records for Los Angeles neighborhoods. All names must match the `name`
// property in frontend/public/la-neighborhoods.geojson exactly.
// All scores are on a 0–100 scale (higher = better for that factor).
// Neighborhoods in the GeoJSON with no entry here default to pillowIndex: 50.
//
// Intentionally spread across the full thermal range:
//   COLD  (~0–24)   deep purple  — Hollywood, Watts
//   COOL  (~25–44)  violet/red   — Boyle Heights, Mid-Wilshire, Downtown, Van Nuys
//   WARM  (~45–64)  orange       — Echo Park, Silver Lake, Koreatown, North Hollywood, Mar Vista
//   HOT   (~65–81)  gold         — Los Feliz, Eagle Rock, Highland Park, Sherman Oaks, Studio City, Hancock Park
//   MAX   (~82–100) pale yellow  — Venice, Westwood, Brentwood
//
// TO REPLACE WITH REAL DATA: swap this array with records from an API or JSON file.
// Each entry must satisfy NeighborhoodData. The `name` field must match the GeoJSON.
export const neighborhoods: NeighborhoodData[] = [
  // ── COLD (pillowIndex ~15–22) ────────────────────────────────────────────
  {
    id: "hollywood",
    name: "Hollywood",
    zip: "90028",
    scores: { price: 8, walkability: 18, traffic: 12, transit: 25, environmentalRisks: 15, noisePollution: 10, airQuality: 20 },
  },
  {
    id: "watts",
    name: "Watts",
    zip: "90002",
    scores: { price: 22, walkability: 20, traffic: 28, transit: 30, environmentalRisks: 18, noisePollution: 15, airQuality: 18 },
  },

  // ── COOL (pillowIndex ~35–43) ────────────────────────────────────────────
  {
    id: "boyle-heights",
    name: "Boyle Heights",
    zip: "90033",
    scores: { price: 38, walkability: 35, traffic: 40, transit: 42, environmentalRisks: 35, noisePollution: 30, airQuality: 32 },
  },
  {
    id: "mid-wilshire",
    name: "Mid-Wilshire",
    zip: "90036",
    scores: { price: 42, walkability: 45, traffic: 38, transit: 50, environmentalRisks: 42, noisePollution: 35, airQuality: 40 },
  },
  {
    id: "downtown",
    name: "Downtown",
    zip: "90012",
    scores: { price: 45, walkability: 50, traffic: 30, transit: 55, environmentalRisks: 42, noisePollution: 22, airQuality: 38 },
  },
  {
    id: "van-nuys",
    name: "Van Nuys",
    zip: "91405",
    scores: { price: 40, walkability: 38, traffic: 35, transit: 42, environmentalRisks: 38, noisePollution: 32, airQuality: 35 },
  },

  // ── WARM (pillowIndex ~48–62) ────────────────────────────────────────────
  {
    id: "echo-park",
    name: "Echo Park",
    zip: "90026",
    scores: { price: 52, walkability: 55, traffic: 50, transit: 58, environmentalRisks: 48, noisePollution: 45, airQuality: 50 },
  },
  {
    id: "silver-lake",
    name: "Silver Lake",
    zip: "90026",
    scores: { price: 48, walkability: 60, traffic: 55, transit: 62, environmentalRisks: 55, noisePollution: 50, airQuality: 55 },
  },
  {
    id: "koreatown",
    name: "Koreatown",
    zip: "90005",
    scores: { price: 58, walkability: 62, traffic: 45, transit: 68, environmentalRisks: 55, noisePollution: 48, airQuality: 52 },
  },
  {
    id: "north-hollywood",
    name: "North Hollywood",
    zip: "91601",
    scores: { price: 55, walkability: 52, traffic: 50, transit: 58, environmentalRisks: 52, noisePollution: 48, airQuality: 50 },
  },
  {
    id: "mar-vista",
    name: "Mar Vista",
    zip: "90066",
    scores: { price: 55, walkability: 58, traffic: 60, transit: 52, environmentalRisks: 62, noisePollution: 60, airQuality: 65 },
  },

  // ── HOT (pillowIndex ~65–78) ─────────────────────────────────────────────
  {
    id: "los-feliz",
    name: "Los Feliz",
    zip: "90027",
    scores: { price: 60, walkability: 70, traffic: 65, transit: 68, environmentalRisks: 65, noisePollution: 68, airQuality: 70 },
  },
  {
    id: "eagle-rock",
    name: "Eagle Rock",
    zip: "90041",
    scores: { price: 62, walkability: 65, traffic: 68, transit: 65, environmentalRisks: 68, noisePollution: 70, airQuality: 66 },
  },
  {
    id: "highland-park",
    name: "Highland Park",
    zip: "90042",
    scores: { price: 65, walkability: 68, traffic: 70, transit: 65, environmentalRisks: 68, noisePollution: 70, airQuality: 68 },
  },
  {
    id: "sherman-oaks",
    name: "Sherman Oaks",
    zip: "91403",
    scores: { price: 62, walkability: 70, traffic: 68, transit: 65, environmentalRisks: 72, noisePollution: 72, airQuality: 70 },
  },
  {
    id: "studio-city",
    name: "Studio City",
    zip: "91604",
    scores: { price: 60, walkability: 68, traffic: 72, transit: 65, environmentalRisks: 75, noisePollution: 75, airQuality: 72 },
  },
  {
    id: "hancock-park",
    name: "Hancock Park",
    zip: "90004",
    scores: { price: 62, walkability: 72, traffic: 65, transit: 70, environmentalRisks: 68, noisePollution: 72, airQuality: 68 },
  },

  // ── MAX HEAT (pillowIndex ~80–88) ────────────────────────────────────────
  {
    id: "venice",
    name: "Venice",
    zip: "90291",
    scores: { price: 72, walkability: 85, traffic: 78, transit: 75, environmentalRisks: 80, noisePollution: 78, airQuality: 88 },
  },
  {
    id: "westwood",
    name: "Westwood",
    zip: "90024",
    scores: { price: 75, walkability: 82, traffic: 78, transit: 82, environmentalRisks: 80, noisePollution: 80, airQuality: 88 },
  },
  {
    id: "brentwood",
    name: "Brentwood",
    zip: "90049",
    scores: { price: 78, walkability: 80, traffic: 82, transit: 75, environmentalRisks: 88, noisePollution: 85, airQuality: 90 },
  },
];

// Name-keyed lookup for fast joins with GeoJSON features at render time.
export const neighborhoodByName = new Map(neighborhoods.map((n) => [n.name, n]));

export interface Weights {
  price: number;
  walkability: number;
  traffic: number;
  transit: number;
  environmentalRisks: number;
  noisePollution: number;
  airQuality: number;
}

export const DEFAULT_WEIGHTS: Weights = {
  price: 3,
  walkability: 3,
  traffic: 3,
  transit: 3,
  environmentalRisks: 3,
  noisePollution: 3,
  airQuality: 3,
};

// ─── SCORING UTILITIES ───────────────────────────────────────────────────────
// These functions are dataset-agnostic — they work with any NeighborhoodData
// scores block and any Weights object that shares the same keys.

// Weighted average of all active factors. Returns 0–100.
// Factors with weight 0 are excluded from the average.
export function calculatePillowIndex(scores: NeighborhoodData["scores"], weights: Weights): number {
  const factors = Object.keys(weights) as ScoreFactor[];
  let totalWeight = 0;
  let weightedSum = 0;

  for (const factor of factors) {
    const w = weights[factor];
    totalWeight += w;
    weightedSum += scores[factor] * w;
  }

  if (totalWeight === 0) return 50;
  return Math.round(weightedSum / totalWeight);
}

// Thermal gradient color for a given 0–100 score.
// Used by UI components (e.g. AreaDetailPanel progress bars).
export function getScoreColor(score: number): string {
  if (score <= 30) {
    const t = score / 30;
    const r = Math.round(20 + t * 60);
    const g = Math.round(0 + t * 10);
    const b = Math.round(80 + t * 80);
    return `rgba(${r}, ${g}, ${b}, 0.75)`;
  } else if (score <= 50) {
    const t = (score - 30) / 20;
    const r = Math.round(80 + t * 140);
    const g = Math.round(10 + t * 20);
    const b = Math.round(160 - t * 130);
    return `rgba(${r}, ${g}, ${b}, 0.75)`;
  } else if (score <= 70) {
    const t = (score - 50) / 20;
    const r = Math.round(220 + t * 35);
    const g = Math.round(30 + t * 150);
    const b = Math.round(30 - t * 20);
    return `rgba(${r}, ${g}, ${b}, 0.75)`;
  } else {
    const t = (score - 70) / 30;
    const r = Math.round(255);
    const g = Math.round(180 + t * 60);
    const b = Math.round(10 + t * 140);
    return `rgba(${r}, ${g}, ${b}, 0.8)`;
  }
}

export function getScoreBorderColor(_score: number): string {
  return "rgba(0, 255, 65, 0.35)";
}
