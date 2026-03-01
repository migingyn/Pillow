import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { X, TrendingUp, TrendingDown, Sparkles, Crosshair, ExternalLink } from "lucide-react";
import { Weights, FactorSelections } from "@/data/neighborhoods";

// ─── TYPES ────────────────────────────────────────────────────────────────────
export interface CensusBlockData {
  geoid: string;
  walkability: number; // 0–1, higher = better
  transit: number;     // 0–1
  vmt: number;         // 0–1, higher = less car-dependent
  composite: number;   // 0–1 pre-computed
  price: number;       // 0–1, affordability (higher = more affordable)
  floodSafe: number;   // 0–1, inverted flood risk (higher = safer)
  quakeSafe: number;   // 0–1, inverted earthquake risk
  fireSafe: number;    // 0–1, inverted wildfire risk
  airSafe: number;     // 0–1, inverted air quality composite (higher = cleaner)
  lat: number;         // click latitude
  lng: number;         // click longitude
}

interface Props {
  block: CensusBlockData;
  weights: Weights;
  selections: FactorSelections;
  onClose: () => void;
}

// ─── FACTOR DISPLAY CONFIG ────────────────────────────────────────────────────
const FACTORS = [
  { key: "walkability" as const, label: "Walkability" },
  { key: "transit"     as const, label: "Transit Access" },
  { key: "vmt"         as const, label: "Low Car Dependency" },
  { key: "price"       as const, label: "Affordability" },
  { key: "floodSafe"   as const, label: "Flood Safety" },
  { key: "quakeSafe"   as const, label: "Seismic Safety" },
  { key: "fireSafe"    as const, label: "Wildfire Safety" },
  { key: "airSafe"     as const, label: "Air Quality" },
] as const;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const getThermalLabel = (score: number) => {
  if (score >= 80) return { text: "HOT",  cls: "text-yellow-300 border-yellow-300/30 bg-yellow-300/10" };
  if (score >= 60) return { text: "WARM", cls: "text-orange-400 border-orange-400/30 bg-orange-400/10" };
  if (score >= 40) return { text: "COOL", cls: "text-red-400   border-red-400/30   bg-red-400/10"   };
  return                { text: "COLD", cls: "text-purple-400 border-purple-400/30 bg-purple-400/10" };
};

const getBarGradient = (score: number) => {
  if (score >= 70) return "from-yellow-400 to-yellow-200";
  if (score >= 50) return "from-orange-500 to-yellow-500";
  if (score >= 30) return "from-red-600 to-orange-500";
  return "from-purple-800 to-red-600";
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────
const CensusBlockPanel = ({ block, weights, selections, onClose }: Props) => {
  // Weighted score matching buildColorExpr in MapPage
  const wPrice   = weights.price / 5;
  const wWalk    = selections.livability.walkability ? weights.walkability / 5 : 0;
  const wTransit = selections.livability.transit     ? weights.transit     / 5 : 0;
  const wTraffic = weights.traffic / 5;

  const envTotal = weights.environmentalRisks / 5;
  const { floodRisk, earthquakeRisk, wildfireRisk, airQuality } = selections.environmental;
  const envCount  = [floodRisk, earthquakeRisk, wildfireRisk, airQuality].filter(Boolean).length || 1;
  const wFlood    = floodRisk      ? envTotal / envCount : 0;
  const wQuake    = earthquakeRisk ? envTotal / envCount : 0;
  const wFire     = wildfireRisk   ? envTotal / envCount : 0;
  const wAir      = airQuality     ? envTotal / envCount : 0;
  const actualEnv = wFlood + wQuake + wFire + wAir;

  const denom = wPrice + wWalk + wTransit + wTraffic + actualEnv;
  const rawScore = denom === 0
    ? block.composite
    : (
        wPrice   * block.price     +
        wWalk    * block.walkability +
        wTransit * block.transit   +
        wTraffic * block.vmt       +
        wFlood   * block.floodSafe +
        wQuake   * block.quakeSafe +
        wFire    * block.fireSafe  +
        wAir     * block.airSafe
      ) / denom;
  const locusIndex = Math.round(rawScore * 100);

  const scores = {
    walkability: Math.round(block.walkability * 100),
    transit:     Math.round(block.transit     * 100),
    vmt:         Math.round(block.vmt         * 100),
    price:       Math.round(block.price       * 100),
    floodSafe:   Math.round(block.floodSafe   * 100),
    quakeSafe:   Math.round(block.quakeSafe   * 100),
    fireSafe:    Math.round(block.fireSafe    * 100),
    airSafe:     Math.round(block.airSafe     * 100),
  };

  const sorted    = FACTORS.map(f => ({ ...f, score: scores[f.key] })).sort((a, b) => b.score - a.score);
  const strengths = sorted.filter(f => f.score >= 60).slice(0, 3);
  const risks     = sorted.filter(f => f.score <  50).slice(0, 3);
  const thermal   = getThermalLabel(locusIndex);

  // Reverse-geocode lat/lng → zip code for listing site links
  const [zip, setZip] = useState<string | null>(null);
  useEffect(() => {
    setZip(null);
    const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
    if (!token) return;
    fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${block.lng},${block.lat}.json?access_token=${token}&types=postcode&limit=1`
    )
      .then(r => r.json())
      .then((data: { features?: { text?: string }[] }) => {
        setZip(data.features?.[0]?.text ?? null);
      })
      .catch(() => {});
  }, [block.geoid]);

  // AI analysis
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setAiSummary(null);
    setAiLoading(true);

    fetch("/api/anthropic", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      signal:  ctrl.signal,
      body: JSON.stringify({
        max_tokens: 200,
        system:
          "You are a concise urban planning analyst. Given census-block livability scores (0–100, higher = better), write 2–3 sentences: why this block scored as it did, who it suits best, and one practical insight. Be specific and direct. No bullet points.",
        messages: [{
          role: "user",
          content:
            `Census Block: ${block.geoid}\n` +
            `Locus Index: ${locusIndex}/100\n` +
            `Walkability: ${scores.walkability}/100\n` +
            `Transit Access: ${scores.transit}/100\n` +
            `Low Car Dependency: ${scores.vmt}/100\n` +
            `Affordability: ${scores.price}/100\n` +
            `Flood Safety: ${scores.floodSafe}/100\n` +
            `Seismic Safety: ${scores.quakeSafe}/100\n` +
            `Wildfire Safety: ${scores.fireSafe}/100\n` +
            `Air Quality: ${scores.airSafe}/100`,
        }],
      }),
    })
      .then(r => r.json())
      .then((data: { content?: { type: string; text: string }[]; error?: string }) => {
        if (!ctrl.signal.aborted)
          setAiSummary(data.content?.[0]?.text ?? data.error ?? "Analysis unavailable.");
      })
      .catch(() => { if (!ctrl.signal.aborted) setAiSummary("Analysis unavailable."); })
      .finally(() => { if (!ctrl.signal.aborted) setAiLoading(false); });

    return () => ctrl.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.geoid]);

  return (
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="absolute top-0 right-0 z-[999] h-full w-[calc(100vw-2.5rem)] sm:w-80 bg-background/95 backdrop-blur-xl border-l border-border overflow-y-auto"
    >
      <div className="p-4 pt-[72px]">

        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Crosshair className="h-3 w-3 text-primary" />
              <span className="text-[9px] font-mono text-primary/60 tracking-widest uppercase">Target Acquired</span>
            </div>
            <h2 className="font-mono font-bold text-foreground text-sm tracking-wider uppercase">Census Block</h2>
            <p className="text-[10px] font-mono text-muted-foreground tracking-wider">{block.geoid}</p>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded border border-border flex items-center justify-center hover:border-primary/40 transition-colors shrink-0"
            aria-label="Close panel"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>

        {/* Score badge */}
        <div className="flex items-center gap-3 mb-1">
          <motion.span
            key={locusIndex}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="text-3xl font-mono font-bold text-foreground"
          >
            {locusIndex}
          </motion.span>
          <span className="text-sm font-mono text-muted-foreground">/100</span>
          <motion.span
            key={thermal.text}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border tracking-widest ${thermal.cls}`}
          >
            {thermal.text}
          </motion.span>
        </div>
        <p className="text-[9px] font-mono text-muted-foreground mb-5 tracking-wide">Based on current scan parameters</p>

        <div className="h-px bg-border mb-4" />

        {/* Listing site links */}
        <h3 className="text-[10px] font-mono font-bold text-primary/70 mb-3 tracking-widest uppercase">Browse Listings</h3>
        {zip ? (
          <div className="flex flex-col gap-2">
            {([
              { name: "Zillow",      href: `https://www.zillow.com/homes/${zip}_rb/` },
              { name: "Redfin",      href: `https://www.redfin.com/zipcode/${zip}/` },
              { name: "Realtor.com", href: `https://www.realtor.com/realestateandhomes-search/${zip}/` },
            ] as const).map(({ name, href }) => (
              <a
                key={name}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-3 py-2 rounded border border-border text-[10px] font-mono text-foreground/80 hover:border-primary/40 hover:text-primary transition-colors tracking-wide"
              >
                <span>{name} <span className="text-muted-foreground">· {zip}</span></span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            ))}
          </div>
        ) : (
          <p className="text-[10px] font-mono text-muted-foreground tracking-wide">Locating area…</p>
        )}

        <div className="h-px bg-border mt-4 mb-4" />

        {/* Strengths */}
        {strengths.length > 0 && (
          <div className="mb-4">
            <h3 className="text-[10px] font-mono font-bold text-primary mb-2 tracking-widest uppercase flex items-center gap-1.5 neon-text">
              <TrendingUp className="h-3 w-3" /> Strengths
            </h3>
            <div className="space-y-1">
              {strengths.map(f => (
                <p key={f.key} className="text-[11px] font-mono text-foreground/80">
                  &#x2023; {f.label} — {f.score}
                </p>
              ))}
            </div>
          </div>
        )}

        {risks.length > 0 && (
          <div className="mb-5">
            <h3 className="text-[10px] font-mono font-bold text-destructive mb-2 tracking-widest uppercase flex items-center gap-1.5">
              <TrendingDown className="h-3 w-3" /> Risks
            </h3>
            <div className="space-y-1">
              {risks.map(f => (
                <p key={f.key} className="text-[11px] font-mono text-foreground/60">
                  &#x2023; {f.label} — {f.score}
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="h-px bg-border mb-4" />

        {/* Factor Analysis */}
        <h3 className="text-[10px] font-mono font-bold text-primary/70 mb-3 tracking-widest uppercase">Factor Analysis</h3>
        <div className="space-y-3">
          {sorted.map(f => (
            <div key={f.key}>
              <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                <span className="text-foreground/80 tracking-wide uppercase">{f.label}</span>
                <span className="text-muted-foreground">{f.score}</span>
              </div>
              <div className="h-1.5 rounded-sm bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${f.score}%` }}
                  transition={{ duration: 0.5, delay: 0.05 }}
                  className={`h-full rounded-sm bg-gradient-to-r ${getBarGradient(f.score)}`}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Data source note */}
        <div className="mt-4 p-3 rounded bg-muted/30 border border-border">
          <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">
            EPA Smart Location Database · GTFS transit feeds · LEHD employment data · HUD affordability · FEMA NRI · CalEnviroScreen
          </p>
        </div>

        {/* AI Analysis */}
        <div className="mt-4 p-3 rounded bg-muted/20 border border-primary/20">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="h-3 w-3 text-primary" />
            <p className="text-[9px] font-mono text-primary/70 tracking-widest uppercase">AI Analysis</p>
          </div>
          {aiLoading ? (
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="h-1 w-1 rounded-full bg-primary/60"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          ) : (
            <p className="text-[11px] font-mono text-muted-foreground leading-relaxed">{aiSummary}</p>
          )}
        </div>

      </div>
    </motion.div>
  );
};

export default CensusBlockPanel;
