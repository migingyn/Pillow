export interface NeighborhoodData {
  id: string;
  name: string;
  zip: string;
  center: [number, number];
  polygon: [number, number][];
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

// ---- High-level slider factor selections (used to include/exclude terms in the scoring formula) ----
export type AffordabilityOption = "trueCost";
export type LivabilityOption = "walkability" | "transit" | "jobOpenings";
export type EnvironmentalOption =
  | "floodRisk"
  | "earthquakeRisk"
  | "wildfireRisk"
  | "airQuality"
  | "noise";

export type FactorSelections = {
  affordability: Record<AffordabilityOption, boolean>;
  livability: Record<LivabilityOption, boolean>;
  environmental: Record<EnvironmentalOption, boolean>;
};

export const DEFAULT_SELECTIONS: FactorSelections = {
  affordability: { trueCost: true },
  livability: { walkability: true, transit: true, jobOpenings: true },
  environmental: {
    floodRisk: true,
    earthquakeRisk: true,
    wildfireRisk: true,
    airQuality: true,
    noise: true,
  },
};

// IMPORTANT NOTE:
// Your dataset currently only has these related fields:
// - "price" (we’re using it as a proxy for affordability/true cost)
// - "environmentalRisks" (one field representing multiple risks)
// - "airQuality", "noisePollution", etc.
// So selections gate inclusion/exclusion of these existing terms.
// When you add trueCost/jobOpenings/flood/quake/wildfire as real score fields later,
// you can update this mapping accordingly.
function isFactorEnabled(factor: ScoreFactor, s: FactorSelections): boolean {
  switch (factor) {
    case "price":
      // proxy for “true cost”
      return s.affordability.trueCost;

    case "walkability":
      return s.livability.walkability;

    case "transit":
      return s.livability.transit;

    case "traffic":
      // not exposed yet in dropdown
      return true;

    case "airQuality":
      return s.environmental.airQuality;

    case "noisePollution":
      return s.environmental.noise;

    case "environmentalRisks":
      // proxy: include if any risk toggle is on
      return (
        s.environmental.floodRisk ||
        s.environmental.earthquakeRisk ||
        s.environmental.wildfireRisk
      );

    default:
      return true;
  }
}

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

export const neighborhoods: NeighborhoodData[] = [
  {
    id: "silver-lake",
    name: "Silver Lake",
    zip: "90026",
    center: [34.0869, -118.2702],
    polygon: [
      [34.095, -118.281],
      [34.095, -118.259],
      [34.079, -118.259],
      [34.079, -118.281],
    ],
    scores: {
      price: 35,
      walkability: 78,
      traffic: 45,
      transit: 72,
      environmentalRisks: 65,
      noisePollution: 55,
      airQuality: 60,
    },
  },
  {
    id: "echo-park",
    name: "Echo Park",
    zip: "90026",
    center: [34.0782, -118.2606],
    polygon: [
      [34.085, -118.271],
      [34.085, -118.25],
      [34.071, -118.25],
      [34.071, -118.271],
    ],
    scores: {
      price: 42,
      walkability: 75,
      traffic: 40,
      transit: 70,
      environmentalRisks: 60,
      noisePollution: 50,
      airQuality: 58,
    },
  },
  {
    id: "hollywood",
    name: "Hollywood",
    zip: "90028",
    center: [34.0928, -118.3287],
    polygon: [
      [34.105, -118.35],
      [34.105, -118.308],
      [34.081, -118.308],
      [34.081, -118.35],
    ],
    scores: {
      price: 30,
      walkability: 70,
      traffic: 30,
      transit: 80,
      environmentalRisks: 55,
      noisePollution: 25,
      airQuality: 45,
    },
  },
  {
    id: "koreatown",
    name: "Koreatown",
    zip: "90005",
    center: [34.058, -118.3005],
    polygon: [
      [34.068, -118.315],
      [34.068, -118.286],
      [34.048, -118.286],
      [34.048, -118.315],
    ],
    scores: {
      price: 55,
      walkability: 82,
      traffic: 25,
      transit: 85,
      environmentalRisks: 70,
      noisePollution: 30,
      airQuality: 50,
    },
  },
  {
    id: "santa-monica",
    name: "Santa Monica",
    zip: "90401",
    center: [34.0195, -118.4912],
    polygon: [
      [34.035, -118.515],
      [34.035, -118.47],
      [34.005, -118.47],
      [34.005, -118.515],
    ],
    scores: {
      price: 15,
      walkability: 88,
      traffic: 50,
      transit: 75,
      environmentalRisks: 45,
      noisePollution: 70,
      airQuality: 82,
    },
  },
  {
    id: "dtla",
    name: "Downtown LA",
    zip: "90012",
    center: [34.0407, -118.2468],
    polygon: [
      [34.06, -118.265],
      [34.06, -118.228],
      [34.025, -118.228],
      [34.025, -118.265],
    ],
    scores: {
      price: 40,
      walkability: 90,
      traffic: 20,
      transit: 92,
      environmentalRisks: 60,
      noisePollution: 20,
      airQuality: 40,
    },
  },
  {
    id: "los-feliz",
    name: "Los Feliz",
    zip: "90027",
    center: [34.1064, -118.288],
    polygon: [
      [34.118, -118.301],
      [34.118, -118.275],
      [34.095, -118.275],
      [34.095, -118.301],
    ],
    scores: {
      price: 28,
      walkability: 72,
      traffic: 55,
      transit: 60,
      environmentalRisks: 50,
      noisePollution: 65,
      airQuality: 68,
    },
  },
  {
    id: "venice",
    name: "Venice",
    zip: "90291",
    center: [33.985, -118.4695],
    polygon: [
      [33.998, -118.487],
      [33.998, -118.452],
      [33.972, -118.452],
      [33.972, -118.487],
    ],
    scores: {
      price: 18,
      walkability: 80,
      traffic: 45,
      transit: 55,
      environmentalRisks: 40,
      noisePollution: 60,
      airQuality: 78,
    },
  },
  {
    id: "culver-city",
    name: "Culver City",
    zip: "90232",
    center: [34.0211, -118.3965],
    polygon: [
      [34.035, -118.415],
      [34.035, -118.378],
      [34.008, -118.378],
      [34.008, -118.415],
    ],
    scores: {
      price: 38,
      walkability: 65,
      traffic: 40,
      transit: 68,
      environmentalRisks: 72,
      noisePollution: 60,
      airQuality: 65,
    },
  },
  {
    id: "highland-park",
    name: "Highland Park",
    zip: "90042",
    center: [34.1114, -118.1922],
    polygon: [
      [34.125, -118.208],
      [34.125, -118.176],
      [34.098, -118.176],
      [34.098, -118.208],
    ],
    scores: {
      price: 50,
      walkability: 60,
      traffic: 55,
      transit: 62,
      environmentalRisks: 55,
      noisePollution: 58,
      airQuality: 55,
    },
  },
  {
    id: "pasadena",
    name: "Pasadena",
    zip: "91101",
    center: [34.1478, -118.1445],
    polygon: [
      [34.165, -118.17],
      [34.165, -118.12],
      [34.13, -118.12],
      [34.13, -118.17],
    ],
    scores: {
      price: 35,
      walkability: 70,
      traffic: 50,
      transit: 70,
      environmentalRisks: 58,
      noisePollution: 65,
      airQuality: 62,
    },
  },
  {
    id: "burbank",
    name: "Burbank",
    zip: "91502",
    center: [34.1808, -118.309],
    polygon: [
      [34.2, -118.335],
      [34.2, -118.283],
      [34.162, -118.283],
      [34.162, -118.335],
    ],
    scores: {
      price: 42,
      walkability: 55,
      traffic: 45,
      transit: 58,
      environmentalRisks: 68,
      noisePollution: 45,
      airQuality: 55,
    },
  },
  {
    id: "glendale",
    name: "Glendale",
    zip: "91204",
    center: [34.1425, -118.2551],
    polygon: [
      [34.16, -118.275],
      [34.16, -118.235],
      [34.125, -118.235],
      [34.125, -118.275],
    ],
    scores: {
      price: 40,
      walkability: 62,
      traffic: 42,
      transit: 65,
      environmentalRisks: 60,
      noisePollution: 55,
      airQuality: 58,
    },
  },
  {
    id: "inglewood",
    name: "Inglewood",
    zip: "90301",
    center: [33.9617, -118.3531],
    polygon: [
      [33.978, -118.372],
      [33.978, -118.334],
      [33.945, -118.334],
      [33.945, -118.372],
    ],
    scores: {
      price: 60,
      walkability: 50,
      traffic: 50,
      transit: 55,
      environmentalRisks: 65,
      noisePollution: 35,
      airQuality: 48,
    },
  },
  {
    id: "westwood",
    name: "Westwood",
    zip: "90024",
    center: [34.0595, -118.4451],
    polygon: [
      [34.072, -118.46],
      [34.072, -118.43],
      [34.047, -118.43],
      [34.047, -118.46],
    ],
    scores: {
      price: 20,
      walkability: 75,
      traffic: 35,
      transit: 72,
      environmentalRisks: 62,
      noisePollution: 60,
      airQuality: 70,
    },
  },
  {
    id: "boyle-heights",
    name: "Boyle Heights",
    zip: "90033",
    center: [34.0345, -118.212],
    polygon: [
      [34.05, -118.228],
      [34.05, -118.196],
      [34.019, -118.196],
      [34.019, -118.228],
    ],
    scores: {
      price: 65,
      walkability: 58,
      traffic: 45,
      transit: 68,
      environmentalRisks: 50,
      noisePollution: 40,
      airQuality: 42,
    },
  },
  {
    id: "mid-wilshire",
    name: "Mid-Wilshire",
    zip: "90036",
    center: [34.0625, -118.3445],
    polygon: [
      [34.074, -118.36],
      [34.074, -118.329],
      [34.051, -118.329],
      [34.051, -118.36],
    ],
    scores: {
      price: 32,
      walkability: 73,
      traffic: 30,
      transit: 78,
      environmentalRisks: 62,
      noisePollution: 40,
      airQuality: 52,
    },
  },
  {
    id: "eagle-rock",
    name: "Eagle Rock",
    zip: "90041",
    center: [34.1392, -118.2148],
    polygon: [
      [34.152, -118.232],
      [34.152, -118.198],
      [34.126, -118.198],
      [34.126, -118.232],
    ],
    scores: {
      price: 45,
      walkability: 58,
      traffic: 55,
      transit: 55,
      environmentalRisks: 58,
      noisePollution: 62,
      airQuality: 60,
    },
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

export function calculatePillowIndex(
  scores: NeighborhoodData["scores"],
  weights: Weights,
  selections: FactorSelections = DEFAULT_SELECTIONS
): number {
  const factors = Object.keys(weights) as ScoreFactor[];
  let totalWeight = 0;
  let weightedSum = 0;

  for (const factor of factors) {
    if (!isFactorEnabled(factor, selections)) continue;

    const w = weights[factor];
    if (w <= 0) continue;

    totalWeight += w;
    weightedSum += scores[factor] * w;
  }

  if (totalWeight === 0) return 50;
  return Math.round(weightedSum / totalWeight);
}

export function getScoreColor(score: number): string {
  // score: 0..100 (higher = stronger match)
  const t = Math.max(0, Math.min(1, score / 100));

  // Higher score => greener (cold / strong match)
  const r = Math.round(255 * (1 - t));
  const g = Math.round(60 + 195 * t);
  const b = Math.round(40 * (1 - t));

  return `rgba(${r}, ${g}, ${b}, 0.75)`;
}

export function getScoreBorderColor(score: number): string {
  const t = Math.max(0, Math.min(1, score / 100));
  const r = Math.round(255 * (1 - t));
  const g = Math.round(60 + 195 * t);
  const b = Math.round(40 * (1 - t));
  return `rgba(${r}, ${g}, ${b}, 0.95)`;
}