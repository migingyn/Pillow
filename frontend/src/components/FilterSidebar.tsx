import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crosshair, RotateCcw, ChevronLeft, SlidersHorizontal } from "lucide-react";
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
  };

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute top-14 left-3 sm:left-4 z-[1000] h-9 w-9 rounded bg-background/90 border border-border flex items-center justify-center hover:border-primary/40 transition-colors neon-border"
        aria-label={isOpen ? "Close filter panel" : "Open filter panel"}
      >
        {isOpen ? (
          <ChevronLeft className="h-4 w-4 text-primary" />
        ) : (
          <SlidersHorizontal className="h-4 w-4 text-primary" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="absolute top-0 left-0 z-[999] h-full w-full sm:w-80 bg-background/95 backdrop-blur-xl border-r border-border overflow-y-auto"
          >
            <div className="p-4 pt-[72px]">
              {/* Header */}
              <div className="flex items-center gap-2 mb-1">
                <Crosshair className="h-3.5 w-3.5 text-primary" />
                <h2 className="font-mono font-bold text-primary text-xs tracking-widest uppercase neon-text">
                  Scan Parameters
                </h2>
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
