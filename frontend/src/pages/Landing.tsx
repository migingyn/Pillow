import { motion } from "framer-motion";
import { Crosshair, SlidersHorizontal, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Landing = () => {
  const navigate = useNavigate();

  const benefits = [
    {
      icon: <BarChart3 className="h-5 w-5" />,
      title: "Pillow Index (0-100)",
      description: "Thermal composite score from real livability data.",
    },
    {
      icon: <SlidersHorizontal className="h-5 w-5" />,
      title: "Tune your parameters",
      description: "Price, walkability, transit, air quality — weight what matters to you.",
    },
    {
      icon: <Crosshair className="h-5 w-5" />,
      title: "Target & analyze",
      description: "Click any zone for a full breakdown of strengths and risks.",
    },
  ];

  return (
    <div className="min-h-dvh bg-background flex flex-col relative thermal-overlay">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
            <Crosshair className="h-4 w-4 text-primary" />
          </div>
          <span className="font-mono font-bold text-primary tracking-widest neon-text">PILLOW</span>
        </div>
        <div className="flex items-center gap-3 sm:gap-6">
          <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase hidden sm:inline">How it works</span>
          <span className="px-2 sm:px-3 py-1 rounded border border-primary/20 text-[10px] font-mono text-primary/60 tracking-widest">LA DEMO</span>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pt-24 pb-12 sm:pb-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-3xl mx-auto w-full"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 text-[10px] font-mono text-primary/60 tracking-widest mb-6 sm:mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            THERMAL SCAN ACTIVE
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight text-foreground mb-4 sm:mb-6 leading-[1.1]">
            Find the best areas
            <br />
            <span className="text-primary neon-text">in Los Angeles.</span>
          </h1>

          <p className="text-sm sm:text-base font-mono text-muted-foreground max-w-lg mx-auto mb-8 sm:mb-10 leading-relaxed tracking-wide">
            Interactive thermal heat map powered by real data. Adjust parameters and watch scores recalculate in real time.
          </p>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/map")}
            className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 rounded bg-primary text-primary-foreground font-mono font-bold text-sm tracking-widest uppercase shadow-[0_0_40px_hsl(var(--primary)/0.25)] hover:shadow-[0_0_60px_hsl(var(--primary)/0.35)] transition-shadow duration-300"
          >
            <Crosshair className="h-4 w-4" />
            Launch Scanner
          </motion.button>
        </motion.div>

        {/* Benefit Cards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mt-16 sm:mt-20 max-w-3xl w-full"
        >
          {benefits.map((b, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
              className="rounded border border-border bg-card/50 p-4 sm:p-5 hover:border-primary/20 transition-colors duration-300 neon-border"
            >
              <div className="text-primary mb-3">{b.icon}</div>
              <h3 className="font-mono font-bold text-foreground text-sm mb-1.5 tracking-wide">{b.title}</h3>
              <p className="text-[11px] font-mono text-muted-foreground leading-relaxed">{b.description}</p>
            </motion.div>
          ))}
        </motion.div>

        <p className="text-[9px] font-mono text-muted-foreground/50 mt-12 sm:mt-16 text-center tracking-widest uppercase">
          Decision-support only · Verify with official sources
        </p>
      </main>
    </div>
  );
};

export default Landing;
