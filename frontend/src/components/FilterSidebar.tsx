import { useMemo, useState } from "react";
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
  const [isOpen, setIsOpen] = useState(true);
  const factors = useMemo(() => Object.keys(FACTOR_LABELS) as ScoreFactor[], []);

  const handleSliderChange = (factor: ScoreFactor, value: number) => {
    onWeightsChange({ ...weights, [factor]: value });
  };

  const handleReset = () => {
    onWeightsChange({ ...DEFAULT_WEIGHTS });
  };

  return (
    <>
      {/* Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute top-14 left-4 z-[1000] h-9 w-9 rounded bg-background/90 border border-border flex items-center justify-center hover:border-primary/40 transition-colors neon-border"
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
            initial={{ x: -360, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -360, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="absolute top-0 left-0 z-[999] h-full w-[320px] bg-background/95 backdrop-blur-xl border-r border-border overflow-y-auto"
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
                <div className="h-2.5 rounded-sm overflow-hidden" style={{
                  background: "linear-gradient(to right, #140050, #5014A0, #D01E28, #E08C14, #FFD700, #FFFAE0)"
                }} />
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
