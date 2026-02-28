import { useEffect, useRef, useMemo, useState } from "react";
import L from "leaflet";
import { AnimatePresence } from "framer-motion";
import { Crosshair } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "leaflet/dist/leaflet.css";

import FilterSidebar from "@/components/FilterSidebar";
import AreaDetailPanel from "@/components/AreaDetailPanel";
import {
  neighborhoods,
  NeighborhoodData,
  Weights,
  DEFAULT_WEIGHTS,
  calculatePillowIndex,
  getScoreColor,
  getScoreBorderColor,
} from "@/data/neighborhoods";

type ScoredNeighborhood = NeighborhoodData & { pillowIndex: number };

const LA_CENTER: [number, number] = [34.0522, -118.2637];
const LA_ZOOM = 11;

const MapPage = () => {
  const navigate = useNavigate();
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const polygonsRef = useRef<L.Polygon[]>([]);
  const [weights, setWeights] = useState<Weights>({ ...DEFAULT_WEIGHTS });
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<ScoredNeighborhood | null>(null);

  const scoredNeighborhoods = useMemo<ScoredNeighborhood[]>(() => {
    return neighborhoods.map((n) => ({
      ...n,
      pillowIndex: calculatePillowIndex(n.scores, weights),
    }));
  }, [weights]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: LA_CENTER,
      zoom: LA_ZOOM,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    polygonsRef.current.forEach((p) => p.remove());
    polygonsRef.current = [];

    scoredNeighborhoods.forEach((n) => {
      const polygon = L.polygon(n.polygon, {
        fillColor: getScoreColor(n.pillowIndex),
        fillOpacity: 0.7,
        color: getScoreBorderColor(n.pillowIndex),
        weight: 1.5,
        dashArray: "4 2",
      }).addTo(map);

      polygon.bindTooltip(
        `<span style="font-weight:bold">${n.name}</span><br/>PILLOW INDEX: ${n.pillowIndex}`,
        { direction: "top", sticky: true }
      );

      polygon.on("click", () => setSelectedNeighborhood(n));

      polygonsRef.current.push(polygon);
    });
  }, [scoredNeighborhoods]);

  return (
    <div className="h-dvh w-screen relative overflow-hidden bg-background thermal-overlay">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-[1000] flex items-center gap-3 px-3 sm:px-4 py-2.5 bg-background/90 backdrop-blur-md border-b border-border neon-border">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 shrink-0">
          <div className="h-7 w-7 rounded bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Crosshair className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="font-mono font-bold text-primary text-sm neon-text tracking-wider hidden xs:inline">PILLOW</span>
        </button>
        <div className="flex-1">
          <input
            type="text"
            placeholder="SEARCH NEIGHBORHOOD / ZIP ..."
            className="w-full px-3 sm:px-4 py-2 rounded bg-muted border border-border text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all tracking-wider uppercase"
          />
        </div>
        <span className="px-3 py-1 rounded border border-primary/20 text-[10px] font-mono text-primary/60 shrink-0 hidden sm:inline-block tracking-widest uppercase">
          LA Demo
        </span>
      </div>

      {/* Map Container */}
      <div ref={mapContainerRef} className="h-full w-full" />

      {/* Thermal Legend — hidden on xs, visible sm+ */}
      <div className="absolute bottom-4 sm:bottom-6 right-3 sm:right-6 z-[999] p-2.5 sm:p-3 rounded bg-background/90 border border-border backdrop-blur-md neon-border hidden sm:block">
        <p className="text-[9px] font-mono text-primary/70 mb-2 tracking-widest uppercase">Thermal Index</p>
        <div className="thermal-gradient-bar h-2.5 w-32 sm:w-40 rounded-sm" />
        <div className="flex justify-between text-[8px] font-mono text-muted-foreground mt-1 tracking-wider">
          <span>COLD</span>
          <span>HOT</span>
        </div>
      </div>

      <FilterSidebar weights={weights} onWeightsChange={setWeights} />

      <AnimatePresence>
        {selectedNeighborhood && (
          <AreaDetailPanel
            neighborhood={selectedNeighborhood}
            weights={weights}
            onClose={() => setSelectedNeighborhood(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default MapPage;
