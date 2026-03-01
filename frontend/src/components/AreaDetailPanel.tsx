import { motion } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { X, TrendingUp, TrendingDown, Info, Crosshair, Sparkles } from "lucide-react";
import {
  NeighborhoodData,
  Weights,
  calculatePillowIndex,
  FACTOR_LABELS,
  ScoreFactor,
} from "@/data/neighborhoods";

interface AreaDetailPanelProps {
  neighborhood: NeighborhoodData;
  weights: Weights;
  onClose: () => void;
}

const AreaDetailPanel = ({ neighborhood, weights, onClose }: AreaDetailPanelProps) => {
  const pillowIndex = calculatePillowIndex(neighborhood.scores, weights);
  const factors = Object.keys(FACTOR_LABELS) as ScoreFactor[];
  const totalWeight = factors.reduce((sum, f) => sum + weights[f], 0);

  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setAiSummary(null);
    setAiLoading(true);

    const { scores } = neighborhood;
    const scoreLines = Object.entries(FACTOR_LABELS)
      .map(([k, label]) => `- ${label}: ${scores[k as ScoreFactor]}/100`)
      .join("\n");

    fetch("/api/anthropic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        max_tokens: 200,
        system:
          "You are a concise real estate analyst. Given neighborhood factor scores (0–100, higher = better), write 2–3 sentences describing: who this neighborhood suits best, its key strength, and its main trade-off. Be specific and practical. No bullet points.",
        messages: [
          {
            role: "user",
            content: `Neighborhood: ${neighborhood.name}\nPillow Index: ${pillowIndex}/100\n${scoreLines}`,
          },
        ],
      }),
    })
      .then((r) => r.json())
      .then((data: { content?: { type: string; text: string }[]; error?: string }) => {
        if (!ctrl.signal.aborted) {
          setAiSummary(data.content?.[0]?.text ?? data.error ?? "Analysis unavailable.");
        }
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setAiSummary("Analysis unavailable.");
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setAiLoading(false);
      });

    return () => ctrl.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [neighborhood.id]);

  const scored = factors
    .filter((f) => weights[f] > 0)
    .map((f) => ({
      factor: f,
      score: neighborhood.scores[f],
      weightPct: totalWeight > 0 ? Math.round((weights[f] / totalWeight) * 100) : 0,
    }))
    .sort((a, b) => b.score - a.score);

  const topDrivers = scored.filter((s) => s.score >= 60).slice(0, 3);
  const tradeoffs = scored.filter((s) => s.score < 50).slice(0, 3);

  const getBarGradient = (score: number) => {
    if (score >= 70) return "from-yellow-400 to-yellow-200";
    if (score >= 50) return "from-orange-500 to-yellow-500";
    if (score >= 30) return "from-red-600 to-orange-500";
    return "from-purple-800 to-red-600";
  };

  const getThermalLabel = (score: number) => {
    if (score >= 80) return { text: "HOT", className: "text-yellow-300 border-yellow-300/30 bg-yellow-300/10" };
    if (score >= 60) return { text: "WARM", className: "text-orange-400 border-orange-400/30 bg-orange-400/10" };
    if (score >= 40) return { text: "COOL", className: "text-red-400 border-red-400/30 bg-red-400/10" };
    return { text: "COLD", className: "text-purple-400 border-purple-400/30 bg-purple-400/10" };
  };

  const thermal = getThermalLabel(pillowIndex);

  return (
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="absolute top-0 right-0 z-[999] h-full w-full sm:w-80 bg-background/95 backdrop-blur-xl border-l border-border overflow-y-auto"
    >
      <div className="p-4 pt-14">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Crosshair className="h-3 w-3 text-primary" />
              <span className="text-[9px] font-mono text-primary/60 tracking-widest uppercase">Target Acquired</span>
            </div>
            <h2 className="font-display font-bold text-foreground text-lg">{neighborhood.name}</h2>
            <p className="text-[10px] font-mono text-muted-foreground tracking-wider">{neighborhood.zip}</p>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded border border-border flex items-center justify-center hover:border-primary/40 transition-colors shrink-0"
            aria-label="Close panel"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>

        {/* Index Badge */}
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl font-mono font-bold text-foreground">{pillowIndex}</span>
          <span className="text-sm font-mono text-muted-foreground">/100</span>
          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border tracking-widest ${thermal.className}`}>
            {thermal.text}
          </span>
        </div>
        <p className="text-[9px] font-mono text-muted-foreground mb-5 tracking-wide">Based on current scan parameters</p>

        <div className="h-px bg-border mb-4" />

        {/* Strengths */}
        {topDrivers.length > 0 && (
          <div className="mb-4">
            <h3 className="text-[10px] font-mono font-bold text-primary mb-2 tracking-widest uppercase flex items-center gap-1.5 neon-text">
              <TrendingUp className="h-3 w-3" />
              Strengths
            </h3>
            <div className="space-y-1">
              {topDrivers.map((d) => (
                <p key={d.factor} className="text-[11px] font-mono text-foreground/80">
                  &#x2023; {FACTOR_LABELS[d.factor]} — {d.score}
                </p>
              ))}
            </div>
          </div>
        )}

        {tradeoffs.length > 0 && (
          <div className="mb-5">
            <h3 className="text-[10px] font-mono font-bold text-destructive mb-2 tracking-widest uppercase flex items-center gap-1.5">
              <TrendingDown className="h-3 w-3" />
              Risks
            </h3>
            <div className="space-y-1">
              {tradeoffs.map((d) => (
                <p key={d.factor} className="text-[11px] font-mono text-foreground/60">
                  &#x2023; {FACTOR_LABELS[d.factor]} — {d.score}
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="h-px bg-border mb-4" />

        {/* Factor Breakdown */}
        <h3 className="text-[10px] font-mono font-bold text-primary/70 mb-3 tracking-widest uppercase">Factor Analysis</h3>
        <div className="space-y-3">
          {scored.map((s) => (
            <div key={s.factor}>
              <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                <span className="text-foreground/80 tracking-wide uppercase">{FACTOR_LABELS[s.factor]}</span>
                <span className="text-muted-foreground">
                  {s.score} <span className="text-muted-foreground/40">({s.weightPct}%)</span>
                </span>
              </div>
              <div className="h-1.5 rounded-sm bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${s.score}%` }}
                  transition={{ duration: 0.5, delay: 0.05 }}
                  className={`h-full rounded-sm bg-gradient-to-r ${getBarGradient(s.score)}`}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Methodology */}
        <div className="mt-6 p-3 rounded bg-muted/30 border border-border">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Info className="h-3 w-3 text-muted-foreground" />
            <p className="text-[9px] font-mono text-primary/50 tracking-widest uppercase">Methodology</p>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">
            Weighted composite of normalized factor scores. Adjust scan parameters to recalculate in real time.
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
              {[0, 1, 2].map((i) => (
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

export default AreaDetailPanel;
