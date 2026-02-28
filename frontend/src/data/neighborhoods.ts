// ─── DATASET CONTRACT ────────────────────────────────────────────────────────
// NeighborhoodData is the shape every dataset entry must satisfy.
// When real data replaces the LA demo below, each record should conform to this
// interface. The `scores` block can be extended with additional factors —
// just mirror any new keys in the Weights interface and FACTOR_LABELS map.
//
// COORDINATE CONVENTION: `center` and `polygon` use [lat, lng] order (matching
// Leaflet / Google Maps convention). MapPage converts them to [lng, lat] for
// MapLibre/GeoJSON when building the source layer.
//
// If real data arrives as GeoJSON, the polygon field can be replaced with a
// GeoJSON geometry reference and the toGeoJSON() function in MapPage updated.
export interface NeighborhoodData {
  id: string;
  name: string;
  zip: string;
  center: [number, number];   // [lat, lng]
  polygon: [number, number][]; // [lat, lng] pairs — MapPage reverses for GeoJSON
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
// Hardcoded neighborhood records for the Los Angeles demo.
// All scores are on a 0–100 scale (higher = better for that factor).
//
// TO REPLACE WITH REAL DATA: swap this array with records fetched from an API
// or imported from a JSON file, as long as each entry satisfies NeighborhoodData.
// The scoring, weighting, and map-rendering code in MapPage is fully data-agnostic.
export const neighborhoods: NeighborhoodData[] = [
  {
    id: "silver-lake",
    name: "Silver Lake",
    zip: "90026",
    center: [34.0869, -118.2702],
    polygon: [
      [34.0950, -118.2810],
      [34.0950, -118.2590],
      [34.0790, -118.2590],
      [34.0790, -118.2810],
    ],
    scores: { price: 35, walkability: 78, traffic: 45, transit: 72, environmentalRisks: 65, noisePollution: 55, airQuality: 60 },
  },
  {
    id: "echo-park",
    name: "Echo Park",
    zip: "90026",
    center: [34.0782, -118.2606],
    polygon: [
      [34.0850, -118.2710],
      [34.0850, -118.2500],
      [34.0710, -118.2500],
      [34.0710, -118.2710],
    ],
    scores: { price: 42, walkability: 75, traffic: 40, transit: 70, environmentalRisks: 60, noisePollution: 50, airQuality: 58 },
  },
  {
    id: "hollywood",
    name: "Hollywood",
    zip: "90028",
    center: [34.0928, -118.3287],
    polygon: [
      [34.1050, -118.3500],
      [34.1050, -118.3080],
      [34.0810, -118.3080],
      [34.0810, -118.3500],
    ],
    scores: { price: 30, walkability: 70, traffic: 30, transit: 80, environmentalRisks: 55, noisePollution: 25, airQuality: 45 },
  },
  {
    id: "koreatown",
    name: "Koreatown",
    zip: "90005",
    center: [34.0580, -118.3005],
    polygon: [
      [34.0680, -118.3150],
      [34.0680, -118.2860],
      [34.0480, -118.2860],
      [34.0480, -118.3150],
    ],
    scores: { price: 55, walkability: 82, traffic: 25, transit: 85, environmentalRisks: 70, noisePollution: 30, airQuality: 50 },
  },
  {
    id: "santa-monica",
    name: "Santa Monica",
    zip: "90401",
    center: [34.0195, -118.4912],
    polygon: [
      [34.0350, -118.5150],
      [34.0350, -118.4700],
      [34.0050, -118.4700],
      [34.0050, -118.5150],
    ],
    scores: { price: 15, walkability: 88, traffic: 50, transit: 75, environmentalRisks: 45, noisePollution: 70, airQuality: 82 },
  },
  {
    id: "dtla",
    name: "Downtown LA",
    zip: "90012",
    center: [34.0407, -118.2468],
    polygon: [
      [34.0600, -118.2650],
      [34.0600, -118.2280],
      [34.0250, -118.2280],
      [34.0250, -118.2650],
    ],
    scores: { price: 40, walkability: 90, traffic: 20, transit: 92, environmentalRisks: 60, noisePollution: 20, airQuality: 40 },
  },
  {
    id: "los-feliz",
    name: "Los Feliz",
    zip: "90027",
    center: [34.1064, -118.2880],
    polygon: [
      [34.1180, -118.3010],
      [34.1180, -118.2750],
      [34.0950, -118.2750],
      [34.0950, -118.3010],
    ],
    scores: { price: 28, walkability: 72, traffic: 55, transit: 60, environmentalRisks: 50, noisePollution: 65, airQuality: 68 },
  },
  {
    id: "venice",
    name: "Venice",
    zip: "90291",
    center: [33.9850, -118.4695],
    polygon: [
      [33.9980, -118.4870],
      [33.9980, -118.4520],
      [33.9720, -118.4520],
      [33.9720, -118.4870],
    ],
    scores: { price: 18, walkability: 80, traffic: 45, transit: 55, environmentalRisks: 40, noisePollution: 60, airQuality: 78 },
  },
  {
    id: "culver-city",
    name: "Culver City",
    zip: "90232",
    center: [34.0211, -118.3965],
    polygon: [
      [34.0350, -118.4150],
      [34.0350, -118.3780],
      [34.0080, -118.3780],
      [34.0080, -118.4150],
    ],
    scores: { price: 38, walkability: 65, traffic: 40, transit: 68, environmentalRisks: 72, noisePollution: 60, airQuality: 65 },
  },
  {
    id: "highland-park",
    name: "Highland Park",
    zip: "90042",
    center: [34.1114, -118.1922],
    polygon: [
      [34.1250, -118.2080],
      [34.1250, -118.1760],
      [34.0980, -118.1760],
      [34.0980, -118.2080],
    ],
    scores: { price: 50, walkability: 60, traffic: 55, transit: 62, environmentalRisks: 55, noisePollution: 58, airQuality: 55 },
  },
  {
    id: "pasadena",
    name: "Pasadena",
    zip: "91101",
    center: [34.1478, -118.1445],
    polygon: [
      [34.1650, -118.1700],
      [34.1650, -118.1200],
      [34.1300, -118.1200],
      [34.1300, -118.1700],
    ],
    scores: { price: 35, walkability: 70, traffic: 50, transit: 70, environmentalRisks: 58, noisePollution: 65, airQuality: 62 },
  },
  {
    id: "burbank",
    name: "Burbank",
    zip: "91502",
    center: [34.1808, -118.3090],
    polygon: [
      [34.2000, -118.3350],
      [34.2000, -118.2830],
      [34.1620, -118.2830],
      [34.1620, -118.3350],
    ],
    scores: { price: 42, walkability: 55, traffic: 45, transit: 58, environmentalRisks: 68, noisePollution: 45, airQuality: 55 },
  },
  {
    id: "glendale",
    name: "Glendale",
    zip: "91204",
    center: [34.1425, -118.2551],
    polygon: [
      [34.1600, -118.2750],
      [34.1600, -118.2350],
      [34.1250, -118.2350],
      [34.1250, -118.2750],
    ],
    scores: { price: 40, walkability: 62, traffic: 42, transit: 65, environmentalRisks: 60, noisePollution: 55, airQuality: 58 },
  },
  {
    id: "inglewood",
    name: "Inglewood",
    zip: "90301",
    center: [33.9617, -118.3531],
    polygon: [
      [33.9780, -118.3720],
      [33.9780, -118.3340],
      [33.9450, -118.3340],
      [33.9450, -118.3720],
    ],
    scores: { price: 60, walkability: 50, traffic: 50, transit: 55, environmentalRisks: 65, noisePollution: 35, airQuality: 48 },
  },
  {
    id: "westwood",
    name: "Westwood",
    zip: "90024",
    center: [34.0595, -118.4451],
    polygon: [
      [34.0720, -118.4600],
      [34.0720, -118.4300],
      [34.0470, -118.4300],
      [34.0470, -118.4600],
    ],
    scores: { price: 20, walkability: 75, traffic: 35, transit: 72, environmentalRisks: 62, noisePollution: 60, airQuality: 70 },
  },
  {
    id: "boyle-heights",
    name: "Boyle Heights",
    zip: "90033",
    center: [34.0345, -118.2120],
    polygon: [
      [34.0500, -118.2280],
      [34.0500, -118.1960],
      [34.0190, -118.1960],
      [34.0190, -118.2280],
    ],
    scores: { price: 65, walkability: 58, traffic: 45, transit: 68, environmentalRisks: 50, noisePollution: 40, airQuality: 42 },
  },
  {
    id: "mid-wilshire",
    name: "Mid-Wilshire",
    zip: "90036",
    center: [34.0625, -118.3445],
    polygon: [
      [34.0740, -118.3600],
      [34.0740, -118.3290],
      [34.0510, -118.3290],
      [34.0510, -118.3600],
    ],
    scores: { price: 32, walkability: 73, traffic: 30, transit: 78, environmentalRisks: 62, noisePollution: 40, airQuality: 52 },
  },
  {
    id: "eagle-rock",
    name: "Eagle Rock",
    zip: "90041",
    center: [34.1392, -118.2148],
    polygon: [
      [34.1520, -118.2320],
      [34.1520, -118.1980],
      [34.1260, -118.1980],
      [34.1260, -118.2320],
    ],
    scores: { price: 45, walkability: 58, traffic: 55, transit: 55, environmentalRisks: 58, noisePollution: 62, airQuality: 60 },
  },
];

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
// NOTE: MapPage uses a MapLibre-native interpolate expression (HEAT_SCALE)
// rather than this function, so the map layer color can be updated
// independently of the data layer. Keep this in sync with HEAT_SCALE in MapPage.tsx.
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
