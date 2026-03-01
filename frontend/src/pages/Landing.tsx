import { motion } from "framer-motion";
import { Crosshair, SlidersHorizontal, BarChart3, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ThermalBoot from "@/components/ThermalBoot";

// ─── GLITCH TEXT ──────────────────────────────────────────────────────────────
// On hover: randomises each character with binary/symbol noise, then resolves
// left-to-right back to the original string.
const GLITCH_CHARS = "01·|/\\—01·01|01";

const GlitchText = ({ text, className }: { text: string; className?: string }) => {
  const [displayed, setDisplayed] = useState(text);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const resolvedAt = useRef(0);

  const clear = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const start = () => {
    clear();
    resolvedAt.current = 0;
    let tick = 0;
    timerRef.current = setInterval(() => {
      tick++;
      // Advance the "resolved" cursor every 3 ticks (~120 ms per char)
      if (tick % 3 === 0) resolvedAt.current++;
      setDisplayed(
        text
          .split("")
          .map((ch, i) => {
            if (ch === " ") return " ";
            if (i < resolvedAt.current) return ch;
            return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
          })
          .join("")
      );
      if (resolvedAt.current >= text.length) {
        clear();
        setDisplayed(text);
      }
    }, 40);
  };

  const stop = () => { clear(); setDisplayed(text); };

  // Cleanup on unmount
  useEffect(() => clear, []);

  return (
    <span
      className={className}
      onMouseEnter={start}
      onMouseLeave={stop}
      onTouchStart={start}
      onTouchEnd={stop}
    >
      {displayed}
    </span>
  );
};

// Module-level flag: false on hard reload (JS context destroyed),
// stays true across SPA navigation (Landing → Map → Landing).
let hasBooted = false;

// ─── DATA ─────────────────────────────────────────────────────────────────────
const benefits = [
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: "Locus Index (0–100)",
    description: "Thermal composite score from real livability data.",
  },
  {
    icon: <SlidersHorizontal className="h-5 w-5" />,
    title: "Tune your parameters",
    description: "Walkability, transit, air quality — weight what matters to you.",
  },
  {
    icon: <Crosshair className="h-5 w-5" />,
    title: "Target & analyze",
    description: "Hover any census block for a full score breakdown.",
  },
];

const HOW_IT_WORKS = [
  {
    num: "01",
    title: "Raw data, real places",
    desc: "Census-block level scores are sourced from the EPA Smart Location Database, GTFS transit feeds, and LEHD employment data — 8,248 blocks across Los Angeles County, updated quarterly.",
  },
  {
    num: "02",
    title: "Factor normalization",
    desc: "Walkability, transit frequency, employment proximity, and vehicle miles traveled are each normalized to a 0–1 scale. Higher always means better livability for that dimension.",
  },
  {
    num: "03",
    title: "Weighted GPU rendering",
    desc: "Your slider adjustments rewrite a Mapbox GL expression evaluated on the GPU — no server round-trips, no re-renders. The thermal map updates as you drag.",
  },
];

// ─── COMPONENT ────────────────────────────────────────────────────────────────
const Landing = () => {
  const navigate = useNavigate();
  // hasBooted is a module-level var: resets on hard reload, persists across
  // SPA navigation so the animation doesn't replay when coming back from /map.
  const [booted, setBooted] = useState(hasBooted);

  const handleBootDone = () => {
    hasBooted = true;
    setBooted(true);
  };

  const scrollToAbout = () => {
    const el = document.getElementById("about");
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 64;
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <>
      {!booted && <ThermalBoot onDone={handleBootDone} />}
      <div className="min-h-dvh bg-background flex flex-col relative thermal-overlay">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
            <Crosshair className="h-4 w-4 text-primary" />
          </div>
          <span className="font-mono font-bold text-primary tracking-widest neon-text">PILLOW</span>
        </div>
        <div className="flex items-center gap-3 sm:gap-6">
          <button
            onClick={scrollToAbout}
            className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase hover:text-primary/70 transition-colors duration-200"
          >
            <GlitchText text="About Us" />
          </button>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pt-24 pb-12 sm:pb-16 relative z-10">

        <div className="text-center max-w-3xl mx-auto w-full">

          {/* Status badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 text-[10px] font-mono text-primary/60 tracking-widest mb-6 sm:mb-8"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            THERMAL SCAN ACTIVE
          </motion.div>

          {/* Word-by-word animated headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight text-foreground mb-4 sm:mb-6 leading-[1.1]">
            <span className="block">
              {["Find", "the", "best", "areas"].map((word, i) => (
                <motion.span
                  key={word}
                  initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.55, delay: 0.25 + i * 0.1, ease: "easeOut" }}
                  className="inline-block mr-[0.22em]"
                >
                  {word}
                </motion.span>
              ))}
            </span>
            <span className="block text-primary neon-text">
              {["for", "you."].map((word, i) => (
                <motion.span
                  key={word}
                  initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.55, delay: 0.65 + i * 0.1, ease: "easeOut" }}
                  className="inline-block mr-[0.22em] last:mr-0"
                >
                  {word}
                </motion.span>
              ))}
            </span>
          </h1>

          {/* Sub-headline */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="text-sm sm:text-base font-mono text-muted-foreground max-w-lg mx-auto mb-8 sm:mb-10 leading-relaxed tracking-wide"
          >
            Interactive thermal heat map powered by real data. Adjust parameters and watch scores recalculate in real time.
          </motion.p>

          {/* CTA */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.05 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/map")}
            className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 rounded bg-primary text-primary-foreground font-mono font-bold text-sm tracking-widest uppercase shadow-[0_0_40px_hsl(var(--primary)/0.25)] hover:shadow-[0_0_60px_hsl(var(--primary)/0.35)] transition-shadow duration-300"
          >
            <Crosshair className="h-4 w-4" />
            Launch Scanner
          </motion.button>
        </div>

        {/* Benefit cards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mt-16 sm:mt-20 max-w-3xl w-full"
        >
          {benefits.map((b, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.3 + i * 0.1 }}
              className="rounded border border-border bg-card/50 p-4 sm:p-5 hover:border-primary/20 transition-colors duration-300 neon-border"
            >
              <div className="text-primary mb-3">{b.icon}</div>
              <h3 className="font-mono font-bold text-foreground text-sm mb-1.5 tracking-wide">{b.title}</h3>
              <p className="text-[11px] font-mono text-muted-foreground leading-relaxed">{b.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Scroll indicator */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.7, duration: 0.6 }}
          onClick={scrollToAbout}
          className="mt-12 sm:mt-16 flex flex-col items-center gap-1.5 text-muted-foreground/35 hover:text-primary/50 transition-colors duration-200"
        >
          <GlitchText text="How it works" className="text-[9px] font-mono tracking-widest uppercase" />
          <motion.div
            animate={{ y: [0, 5, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown className="h-4 w-4" />
          </motion.div>
        </motion.button>
      </main>

      {/* ── About / How It Works ──────────────────────────────────────────── */}
      <section id="about" className="relative z-10 border-t border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 sm:py-28">

          {/* Section tag */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 text-[10px] font-mono text-primary/60 tracking-widest mb-8"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
            METHODOLOGY
          </motion.div>

          {/* Headline */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-foreground mb-6 leading-tight"
          >
            How the{" "}
            <span className="text-primary neon-text">Locus Index</span>
            <br />is calculated.
          </motion.h2>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="font-mono text-sm text-muted-foreground leading-relaxed mb-14 max-w-xl"
          >
            Locus.Ai aggregates publicly available data across Los Angeles census blocks — walkability,
            transit access, employment proximity, and vehicle miles traveled — into a single
            0–100 thermal score. Every factor is independently adjustable so the map reflects
            your priorities, not a fixed formula.
          </motion.p>

          {/* Steps */}
          <div className="space-y-4">
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, x: -18 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.08 + i * 0.12 }}
                className="flex gap-5 p-5 sm:p-6 rounded border border-border bg-card/30 hover:border-primary/20 hover:bg-card/50 transition-all duration-300"
              >
                <span className="font-mono font-bold text-primary/30 text-xl sm:text-2xl shrink-0 leading-none pt-0.5">
                  {step.num}
                </span>
                <div>
                  <h3 className="font-mono font-bold text-foreground text-sm mb-2 tracking-wide">
                    {step.title}
                  </h3>
                  <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Section CTA */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-12 flex flex-col sm:flex-row items-start sm:items-center gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/map")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded bg-primary text-primary-foreground font-mono font-bold text-sm tracking-widest uppercase shadow-[0_0_30px_hsl(var(--primary)/0.2)] hover:shadow-[0_0_50px_hsl(var(--primary)/0.3)] transition-shadow duration-300"
            >
              <Crosshair className="h-4 w-4" />
              Open the map
            </motion.button>
            <span className="font-mono text-[10px] text-muted-foreground/50 tracking-wider">
              8,248 census blocks · Los Angeles County
            </span>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-border py-6 px-4 sm:px-6">
        <p className="text-[9px] font-mono text-muted-foreground/40 text-center tracking-widest uppercase">
          PILLOW · Decision-support only · Verify with official sources
        </p>
      </footer>

    </div>
    </>
  );
};

export default Landing;
