import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Crosshair } from "lucide-react";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
// Thermal palette: cooler-biased so noise stays subtle (hot yellows/oranges excluded)
const THERMAL_COLORS = [
  "#0a0028", "#140050", "#1e0060", "#2a006e",
  "#5014A0", "#6a18b0", "#8B1090", "#a01880",
];
const CELL      = 9;   // larger cells = softer, less chaotic look
const NOISE_MS  = 900;
const SETTLE_MS = 600;
const FADE_MS   = 500;

const BOOT_MESSAGES = [
  { label: "THERMAL SENSORS",       status: "OK",   delay: 60  },
  { label: "SPATIAL CALIBRATION",   status: "OK",   delay: 280 },
  { label: "LA CENSUS BLOCKS",      status: "8248", delay: 540 },
  { label: "HEAT SIGNATURE",        status: "LIVE", delay: 800 },
];

// ─── COMPONENT ────────────────────────────────────────────────────────────────
interface Props { onDone: () => void }

const ThermalBoot = ({ onDone }: Props) => {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const canvasRaf  = useRef<number>(0);
  const fadeRaf    = useRef<number>(0);
  const [opacity, setOpacity]               = useState(1);
  const [revealed, setRevealed]             = useState<number[]>([]);

  // ── Message reveal timers ─────────────────────────────────────────────────
  useEffect(() => {
    const timers = BOOT_MESSAGES.map(({ delay }, i) =>
      setTimeout(() => setRevealed(p => [...p, i]), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  // ── Fade-out + call onDone ────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      const start = Date.now();
      const tick = () => {
        const p = Math.min((Date.now() - start) / FADE_MS, 1);
        setOpacity(1 - p);
        if (p < 1) fadeRaf.current = requestAnimationFrame(tick);
        else        onDone();
      };
      fadeRaf.current = requestAnimationFrame(tick);
    }, NOISE_MS + SETTLE_MS);

    return () => {
      clearTimeout(t);
      cancelAnimationFrame(fadeRaf.current);
    };
  }, [onDone]);

  // ── Canvas noise ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const startMs = Date.now();

    const draw = () => {
      const elapsed = Date.now() - startMs;
      if (elapsed >= NOISE_MS + SETTLE_MS) return;

      const cols = Math.ceil(canvas.width  / CELL);
      const rows = Math.ceil(canvas.height / CELL);

      const settle = elapsed > NOISE_MS
        ? (elapsed - NOISE_MS) / SETTLE_MS  // 0 → 1
        : 0;

      // Start at ~55% density, drop to near zero during settle
      const density = settle > 0 ? 0.55 * Math.pow(1 - settle, 1.8) : 0.55;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (Math.random() > density) continue;

          const maxIdx   = Math.max(0, Math.round(THERMAL_COLORS.length * (1 - settle * 0.8)) - 1);
          const colorIdx = Math.floor(Math.random() * (maxIdx + 1));
          // Keep alpha low — ghost-like, not solid blocks
          const alpha    = (1 - settle * 0.7) * (0.12 + Math.random() * 0.22);

          ctx.globalAlpha = Math.min(alpha, 1);
          ctx.fillStyle   = THERMAL_COLORS[colorIdx];
          ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
        }
      }
      ctx.globalAlpha = 1;

      canvasRaf.current = requestAnimationFrame(draw);
    };

    canvasRaf.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(canvasRaf.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{ opacity }}
      className="fixed inset-0 z-[9999] bg-background overflow-hidden"
    >
      {/* Thermal pixel noise */}
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* CRT scanline texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.05) 3px, rgba(0,0,0,0.05) 4px)",
        }}
      />

      {/* Sweep scan line (runs twice) */}
      <motion.div
        className="absolute left-0 right-0 h-[2px] pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, hsl(120 100% 40% / 0.35) 50%, transparent 100%)",
          boxShadow: "0 0 10px 2px hsl(120 100% 40% / 0.12)",
        }}
        initial={{ top: "-2px" }}
        animate={{ top: "100vh" }}
        transition={{
          duration: 1.3,
          ease: "linear",
          delay: 0.05,
          repeat: 1,
          repeatDelay: 0.15,
        }}
      />

      {/* Center logo */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.12, ease: "easeOut" }}
          className="flex flex-col items-center gap-4"
        >
          <div className="h-20 w-20 rounded border border-primary/35 bg-primary/5 flex items-center justify-center"
            style={{ boxShadow: "0 0 30px hsl(120 100% 40% / 0.12)" }}
          >
            <Crosshair className="h-9 w-9 text-primary" />
          </div>
          <span className="font-mono font-bold text-primary text-3xl tracking-[0.55em] neon-text">
            PILLOW
          </span>
        </motion.div>
      </div>

      {/* Corner brackets */}
      {([
        "top-5 left-5 border-t-2 border-l-2",
        "top-5 right-5 border-t-2 border-r-2",
        "bottom-5 left-5 border-b-2 border-l-2",
        "bottom-5 right-5 border-b-2 border-r-2",
      ] as const).map((cls, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.08 + i * 0.04, duration: 0.3 }}
          className={`absolute w-10 h-10 border-primary/40 ${cls}`}
        />
      ))}

      {/* Boot diagnostics */}
      <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center gap-1.5 px-4">
        {BOOT_MESSAGES.map((msg, i) => (
          <motion.div
            key={msg.label}
            initial={{ opacity: 0, x: -6 }}
            animate={{
              opacity: revealed.includes(i) ? (i === revealed.length - 1 ? 1 : 0.35) : 0,
              x: revealed.includes(i) ? 0 : -6,
            }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-3 font-mono text-[10px] tracking-widest"
          >
            <span className="text-muted-foreground">{msg.label}</span>
            <span className="w-[2px] h-[2px] rounded-full bg-primary/40 shrink-0" />
            <span className={i === revealed.length - 1 ? "text-primary" : "text-primary/50"}>
              {msg.status}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ThermalBoot;
