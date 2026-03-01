import { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crosshair, RotateCcw, ChevronLeft, SlidersHorizontal, Send } from "lucide-react";
import {
  Weights,
  DEFAULT_WEIGHTS,
  FACTOR_LABELS,
  ScoreFactor,
} from "@/data/neighborhoods";

interface FilterSidebarProps {
  weights: Weights;
  onWeightsChange: (weights: Weights) => void;
}

const FilterSidebar = ({ weights, onWeightsChange }: FilterSidebarProps) => {
  // Start closed on mobile (< 640px), open on desktop
  const [isOpen, setIsOpen] = useState(() => window.innerWidth >= 640);
  const factors = useMemo(() => Object.keys(FACTOR_LABELS) as ScoreFactor[], []);

  const [nlQuery, setNlQuery] = useState("");
  const [nlLoading, setNlLoading] = useState(false);
  const [nlFeedback, setNlFeedback] = useState<string | null>(null);
  const nlAbortRef = useRef<AbortController | null>(null);

  // Close sidebar when resizing to mobile
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 640) setIsOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleSliderChange = (factor: ScoreFactor, value: number) => {
    onWeightsChange({ ...weights, [factor]: value });
  };

  const handleReset = () => {
    onWeightsChange({ ...DEFAULT_WEIGHTS });
    setNlFeedback(null);
  };

  const handleNlSubmit = async () => {
    const q = nlQuery.trim();
    if (!q || nlLoading) return;
    nlAbortRef.current?.abort();
    const ctrl = new AbortController();
    nlAbortRef.current = ctrl;
    setNlLoading(true);
    setNlFeedback(null);

    try {
      const res = await fetch("/api/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          max_tokens: 300,
          system: `You are a neighborhood scoring assistant. Given a natural language preference query, return ONLY valid JSON (no markdown, no extra text) with this exact shape:
{"weights":{"price":0,"walkability":0,"traffic":0,"transit":0,"environmentalRisks":0,"noisePollution":0,"airQuality":0},"summary":"one sentence"}
Use 0 if a factor is irrelevant, 1–2 for minor importance, 3 for moderate, 4–5 for high priority.`,
          messages: [{ role: "user", content: q }],
        }),
      });

      const data = (await res.json()) as { content?: { text: string }[]; error?: string };
      const text = data.content?.[0]?.text ?? "";

      const parsed = JSON.parse(text) as {
        weights: Weights;
        summary: string;
      };

      const clamped = Object.fromEntries(
        (Object.keys(parsed.weights) as ScoreFactor[]).map((k) => [
          k,
          Math.min(5, Math.max(0, Math.round(parsed.weights[k]))),
        ])
      ) as unknown as Weights;

      onWeightsChange(clamped);
      setNlFeedback(parsed.summary);
      setNlQuery("");
    } catch {
      if (!ctrl.signal.aborted) setNlFeedback("Could not parse response — try rephrasing.");
    } finally {
      if (!ctrl.signal.aborted) setNlLoading(false);
    }
  };

  return (
    <>
      {/* Open button — only visible when panel is closed, matches logo icon */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="absolute top-[calc(3.5rem+8px)] left-3 sm:left-4 z-[1000] h-7 w-7 rounded bg-primary/10 border border-primary/30 flex items-center justify-center hover:bg-primary/20 transition-colors"
          aria-label="Open filter panel"
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="absolute top-0 left-0 z-[999] h-full w-[calc(100vw-2.5rem)] sm:w-80 bg-background/95 backdrop-blur-xl border-r border-border overflow-y-auto"
          >
            <div className="p-4 pt-16">
              {/* Header */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Crosshair className="h-3.5 w-3.5 text-primary" />
                  <h2 className="font-mono font-bold text-primary text-xs tracking-widest uppercase neon-text">
                    Scan Parameters
                  </h2>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="h-7 w-7 rounded bg-primary/10 border border-primary/30 flex items-center justify-center hover:bg-primary/20 transition-colors shrink-0"
                  aria-label="Close filter panel"
                >
                  <ChevronLeft className="h-3.5 w-3.5 text-primary" />
                </button>
              </div>
              <p className="text-[10px] font-mono text-muted-foreground mb-5 tracking-wide">
                Adjust weights — heatmap updates in real time
              </p>

              <div className="h-px bg-border mb-4" />

              {/* Sliders */}
              <div className="space-y-4">
                {factors.map((factor) => (
                  <div key={factor}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-mono font-medium text-foreground tracking-wide uppercase">
                        {FACTOR_LABELS[factor]}
                      </span>
                      <span className="text-[10px] font-mono text-primary font-bold">{weights[factor]}/5</span>
                    </div>
                    {/* Slider gradient is dynamic so inline style is required here */}
                    <input
                      type="range"
                      min={0}
                      max={5}
                      step={1}
                      value={weights[factor]}
                      onChange={(e) => handleSliderChange(factor, Number(e.target.value))}
                      className="w-full"
                      style={{
                        background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${(weights[factor] / 5) * 100}%, hsl(var(--muted)) ${(weights[factor] / 5) * 100}%, hsl(var(--muted)) 100%)`,
                      }}
                    />
                    <div className="flex justify-between text-[8px] font-mono text-muted-foreground mt-0.5 tracking-wider">
                      <span>OFF</span>
                      <span>MAX</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reset */}
              <button
                onClick={handleReset}
                className="mt-5 w-full flex items-center justify-center gap-2 px-3 py-2 rounded border border-border text-[10px] font-mono text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors tracking-widest uppercase"
              >
                <RotateCcw className="h-3 w-3" />
                Reset defaults
              </button>

              {/* NL Query */}
              <div className="mt-5">
                <div className="h-px bg-border mb-4" />
                <p className="text-[9px] font-mono text-primary/60 mb-2 tracking-widest uppercase">Natural Language</p>
                <p className="text-[10px] font-mono text-muted-foreground mb-3 leading-relaxed">
                  Describe what matters to you and we'll set the weights.
                </p>
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    value={nlQuery}
                    onChange={(e) => setNlQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleNlSubmit(); } }}
                    placeholder="e.g. I want walkable, quiet streets with good air quality"
                    className="flex-1 resize-none text-[10px] font-mono bg-muted/40 border border-border rounded px-2 py-1.5 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 leading-relaxed"
                  />
                  <button
                    onClick={handleNlSubmit}
                    disabled={nlLoading || !nlQuery.trim()}
                    className="self-end h-10 w-10 sm:h-8 sm:w-8 rounded border border-border flex items-center justify-center hover:border-primary/40 disabled:opacity-30 transition-colors shrink-0"
                    aria-label="Submit query"
                  >
                    {nlLoading ? (
                      <motion.div
                        className="h-3 w-3 rounded-full border border-primary border-t-transparent"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      />
                    ) : (
                      <Send className="h-3 w-3 text-primary" />
                    )}
                  </button>
                </div>
                {nlFeedback && (
                  <p className="mt-2 text-[10px] font-mono text-primary/70 leading-relaxed">{nlFeedback}</p>
                )}
              </div>

              {/* Thermal Legend */}
              <div className="mt-6 p-3 rounded bg-muted/50 border border-border">
                <p className="text-[9px] font-mono text-primary/60 mb-2 tracking-widest uppercase">Thermal Scale</p>
                <div className="thermal-gradient-bar h-2.5 rounded-sm" />
                <div className="flex justify-between text-[8px] font-mono text-muted-foreground mt-1 tracking-wider">
                  <span>COLD</span>
                  <span>WARM</span>
                  <span>HOT</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FilterSidebar;
