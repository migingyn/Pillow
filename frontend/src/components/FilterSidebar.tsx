import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crosshair, RotateCcw, ChevronLeft, SlidersHorizontal } from "lucide-react";
import {
  Weights,
  DEFAULT_WEIGHTS,
  FACTOR_LABELS,
  ScoreFactor,
  FactorSelections,
} from "@/data/neighborhoods";

interface FilterSidebarProps {
  weights: Weights;
  onWeightsChange: (weights: Weights) => void;
  selections: FactorSelections;
  onSelectionsChange: (selections: FactorSelections) => void;
}

const FilterSidebar = ({
  weights,
  onWeightsChange,
  selections,
  onSelectionsChange,
}: FilterSidebarProps) => {
  // Start closed on mobile (< 640px), open on desktop
  const [isOpen, setIsOpen] = useState(() => window.innerWidth >= 640);
  const [openDropdown, setOpenDropdown] = useState<
    null | "affordability" | "environmental" | "livability"
  >(null);

  const factors = useMemo(() => Object.keys(FACTOR_LABELS) as ScoreFactor[], []);

  // Group factors into 3 buckets based on their order in FACTOR_LABELS.
  // If you want different grouping, reorder FACTOR_LABELS in `@/data/neighborhoods`.
  const groupedFactors = useMemo(() => {
    const total = factors.length;
    const size = Math.ceil(total / 3);
    return {
      affordability: factors.slice(0, size),
      environmental: factors.slice(size, size * 2),
      livability: factors.slice(size * 2),
    };
  }, [factors]);

  const getGroupValue = (group: ScoreFactor[]) => {
    if (!group.length) return 0;
    const avg = group.reduce((sum, f) => sum + (weights[f] ?? 0), 0) / group.length;
    return Math.round(avg);
  };

  const handleGroupSliderChange = (group: ScoreFactor[], value: number) => {
    const next: Weights = { ...weights };
    group.forEach((f) => {
      next[f] = value;
    });
    onWeightsChange(next);
  };

  const countSelected = (obj: Record<string, boolean>) =>
    Object.values(obj).filter(Boolean).length;

  const toggleSelection = (
    category: "affordability" | "livability" | "environmental",
    key: string
  ) => {
    const next: FactorSelections = {
      affordability: { ...selections.affordability },
      livability: { ...selections.livability },
      environmental: { ...selections.environmental },
    };

    // @ts-expect-error - key is category-specific
    const currently = next[category][key] as boolean;

    // enforce at least one selected
    if (category === "livability") {
      const currCount = countSelected(next.livability);
      if (currently && currCount === 1) return;
    }
    if (category === "environmental") {
      const currCount = countSelected(next.environmental);
      if (currently && currCount === 1) return;
    }

    // @ts-expect-error - key is category-specific
    next[category][key] = !currently;

    onSelectionsChange(next);
  };

  const closeDropdown = () => setOpenDropdown(null);

  // Close sidebar when resizing to mobile
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 640) setIsOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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
                Adjust the 3 high-level sliders — heatmap updates in real time
              </p>

              <div className="h-px bg-border mb-4" />

              {/* Primary Sliders */}
              <div className="space-y-5">
                {/* Affordability */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-medium text-foreground tracking-wide uppercase">
                        Affordability
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setOpenDropdown(openDropdown === "affordability" ? null : "affordability")
                        }
                        className="px-2 py-0.5 rounded border border-border text-[9px] font-mono text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors tracking-widest uppercase"
                      >
                        Factors ▾
                      </button>
                    </div>
                    <span className="text-[10px] font-mono text-primary font-bold">
                      {getGroupValue(groupedFactors.affordability)}/5
                    </span>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={5}
                    step={1}
                    value={getGroupValue(groupedFactors.affordability)}
                    onChange={(e) =>
                      handleGroupSliderChange(groupedFactors.affordability, Number(e.target.value))
                    }
                    className="w-full"
                    style={{
                      background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${(getGroupValue(groupedFactors.affordability) / 5) * 100}%, hsl(var(--muted)) ${(getGroupValue(groupedFactors.affordability) / 5) * 100}%, hsl(var(--muted)) 100%)`,
                    }}
                  />
                  <div className="flex justify-between text-[8px] font-mono text-muted-foreground mt-0.5 tracking-wider">
                    <span>OFF</span>
                    <span>MAX</span>
                  </div>

                  {openDropdown === "affordability" && (
                    <div className="mt-2 rounded border border-border bg-background/70 p-2">
                      <p className="text-[9px] font-mono text-muted-foreground tracking-wider uppercase mb-2">
                        Include in scoring
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => toggleSelection("affordability", "trueCost")}
                          className={
                            "px-2 py-1 rounded border text-[10px] font-mono tracking-wide " +
                            (selections.affordability.trueCost
                              ? "border-primary/40 text-primary bg-primary/10"
                              : "border-border text-muted-foreground hover:text-foreground")
                          }
                        >
                          True cost
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={closeDropdown}
                        className="mt-2 text-[9px] font-mono text-muted-foreground hover:text-primary tracking-widest uppercase"
                      >
                        Close
                      </button>
                    </div>
                  )}

                  <p className="mt-1 text-[9px] font-mono text-muted-foreground tracking-wide">
                    Controls {groupedFactors.affordability.length} underlying factors
                  </p>
                </div>

                {/* Environmental */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-medium text-foreground tracking-wide uppercase">
                        Environmental
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setOpenDropdown(openDropdown === "environmental" ? null : "environmental")
                        }
                        className="px-2 py-0.5 rounded border border-border text-[9px] font-mono text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors tracking-widest uppercase"
                      >
                        Factors ▾
                      </button>
                    </div>
                    <span className="text-[10px] font-mono text-primary font-bold">
                      {getGroupValue(groupedFactors.environmental)}/5
                    </span>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={5}
                    step={1}
                    value={getGroupValue(groupedFactors.environmental)}
                    onChange={(e) =>
                      handleGroupSliderChange(groupedFactors.environmental, Number(e.target.value))
                    }
                    className="w-full"
                    style={{
                      background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${(getGroupValue(groupedFactors.environmental) / 5) * 100}%, hsl(var(--muted)) ${(getGroupValue(groupedFactors.environmental) / 5) * 100}%, hsl(var(--muted)) 100%)`,
                    }}
                  />
                  <div className="flex justify-between text-[8px] font-mono text-muted-foreground mt-0.5 tracking-wider">
                    <span>OFF</span>
                    <span>MAX</span>
                  </div>

                  {openDropdown === "environmental" && (
                    <div className="mt-2 rounded border border-border bg-background/70 p-2">
                      <p className="text-[9px] font-mono text-muted-foreground tracking-wider uppercase mb-2">
                        Include in scoring (select at least 1)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(
                          [
                            ["floodRisk", "Flood risk"],
                            ["earthquakeRisk", "Earthquake risk"],
                            ["wildfireRisk", "Wildfire risk"],
                            ["airQuality", "Air quality"],
                            ["noise", "Noise"],
                          ] as const
                        ).map(([key, label]) => {
                          const on = selections.environmental[key];
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => toggleSelection("environmental", key)}
                              className={
                                "px-2 py-1 rounded border text-[10px] font-mono tracking-wide " +
                                (on
                                  ? "border-primary/40 text-primary bg-primary/10"
                                  : "border-border text-muted-foreground hover:text-foreground")
                              }
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={closeDropdown}
                        className="mt-2 text-[9px] font-mono text-muted-foreground hover:text-primary tracking-widest uppercase"
                      >
                        Close
                      </button>
                    </div>
                  )}

                  <p className="mt-1 text-[9px] font-mono text-muted-foreground tracking-wide">
                    Controls {groupedFactors.environmental.length} underlying factors
                  </p>
                </div>

                {/* Livability */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-medium text-foreground tracking-wide uppercase">
                        Livability
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setOpenDropdown(openDropdown === "livability" ? null : "livability")
                        }
                        className="px-2 py-0.5 rounded border border-border text-[9px] font-mono text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors tracking-widest uppercase"
                      >
                        Factors ▾
                      </button>
                    </div>
                    <span className="text-[10px] font-mono text-primary font-bold">
                      {getGroupValue(groupedFactors.livability)}/5
                    </span>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={5}
                    step={1}
                    value={getGroupValue(groupedFactors.livability)}
                    onChange={(e) =>
                      handleGroupSliderChange(groupedFactors.livability, Number(e.target.value))
                    }
                    className="w-full"
                    style={{
                      background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${(getGroupValue(groupedFactors.livability) / 5) * 100}%, hsl(var(--muted)) ${(getGroupValue(groupedFactors.livability) / 5) * 100}%, hsl(var(--muted)) 100%)`,
                    }}
                  />
                  <div className="flex justify-between text-[8px] font-mono text-muted-foreground mt-0.5 tracking-wider">
                    <span>OFF</span>
                    <span>MAX</span>
                  </div>

                  {openDropdown === "livability" && (
                    <div className="mt-2 rounded border border-border bg-background/70 p-2">
                      <p className="text-[9px] font-mono text-muted-foreground tracking-wider uppercase mb-2">
                        Include in scoring (select at least 1)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(
                          [
                            ["walkability", "Walkability"],
                            ["transit", "Transit"],
                            ["jobOpenings", "Job openings"],
                          ] as const
                        ).map(([key, label]) => {
                          const on = selections.livability[key];
                          const disabled = key === "jobOpenings"; // until you add data
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => {
                                if (disabled) return;
                                toggleSelection("livability", key);
                              }}
                              className={
                                "px-2 py-1 rounded border text-[10px] font-mono tracking-wide " +
                                (disabled
                                  ? "border-border text-muted-foreground/50 cursor-not-allowed"
                                  : on
                                  ? "border-primary/40 text-primary bg-primary/10"
                                  : "border-border text-muted-foreground hover:text-foreground")
                              }
                              title={disabled ? "Coming soon" : undefined}
                            >
                              {label}
                              {disabled ? " (soon)" : ""}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={closeDropdown}
                        className="mt-2 text-[9px] font-mono text-muted-foreground hover:text-primary tracking-widest uppercase"
                      >
                        Close
                      </button>
                    </div>
                  )}

                  <p className="mt-1 text-[9px] font-mono text-muted-foreground tracking-wide">
                    Controls {groupedFactors.livability.length} underlying factors
                  </p>
                </div>
              </div>

              {/* Reset */}
              <button
                onClick={handleReset}
                className="mt-5 w-full flex items-center justify-center gap-2 px-3 py-2 rounded border border-border text-[10px] font-mono text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors tracking-widest uppercase"
              >
                <RotateCcw className="h-3 w-3" />
                Reset defaults
              </button>

              {/* Match Legend */}
              <div className="mt-6 p-3 rounded bg-muted/50 border border-border">
                <p className="text-[9px] font-mono text-primary/60 mb-2 tracking-widest uppercase">
                  Match Scale
                </p>
                <div className="thermal-gradient-bar h-2.5 rounded-sm" />
                <div className="flex justify-between text-[8px] font-mono text-muted-foreground mt-1 tracking-wider">
                  <span>GREEN / BEST</span>
                  <span>YELLOW</span>
                  <span>RED / WORST</span>
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