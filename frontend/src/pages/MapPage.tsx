import { useEffect, useRef, useMemo, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { AnimatePresence } from "framer-motion";
import { Crosshair } from "lucide-react";
import { useNavigate } from "react-router-dom";

import FilterSidebar from "@/components/FilterSidebar";
import AreaDetailPanel from "@/components/AreaDetailPanel";
import {
  neighborhoods,
  NeighborhoodData,
  Weights,
  DEFAULT_WEIGHTS,
  calculatePillowIndex,
} from "@/data/neighborhoods";

type ScoredNeighborhood = NeighborhoodData & { pillowIndex: number };

// ─── MAP VIEWPORT ────────────────────────────────────────────────────────────
// Hardcoded to LA for the demo. To support other cities/datasets, replace these
// with values from a dataset-level config (e.g. dataset.viewport.center/zoom).
// MapLibre uses [lng, lat] — opposite of Leaflet's [lat, lng].
const LA_CENTER: [number, number] = [-118.2637, 34.0522];
const LA_ZOOM = 10;

const MAPTILER_STYLE =
  "https://api.maptiler.com/maps/019ca644-729a-7eee-af3e-8eea6c2b26d6/style.json?key=27Xv0X1EmSlGDpw9yne9";

// ─── LAYER IDs ───────────────────────────────────────────────────────────────
const SOURCE_ID  = "neighborhoods";
const FILL_LAYER = "neighborhoods-fill";
const LINE_LAYER = "neighborhoods-line";

// ─── HEAT SIGNATURE ──────────────────────────────────────────────────────────
// MapLibre-native color interpolation keyed on each feature's `pillowIndex` (0–100).
// Runs on the GPU — all polygons recolor instantly when weights change without
// re-rendering React or rebuilding the GeoJSON source.
//
// To change the color palette: edit the score → hex-color pairs below.
// Score  Color      Thermal meaning
// ─────  ─────────  ───────────────
//   0    #140050    cold   — deep purple
//  25    #5014A0    cool   — violet
//  45    #D01E28    warm   — red
//  65    #E08C14    hot    — orange
//  82    #FFD700    hotter — gold
// 100    #FFFAE0    max    — pale yellow-white
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const HEAT_SCALE: any = [
  "interpolate", ["linear"], ["get", "pillowIndex"],
  0,   "#140050",
  25,  "#5014A0",
  45,  "#D01E28",
  65,  "#E08C14",
  82,  "#FFD700",
  100, "#FFFAE0",
];

// Uniform neon green border — all neighborhoods get the same outline so the
// thermal fill color is the sole signal. Alpha kept low to stay readable.
const NEON_BORDER = "rgba(0, 255, 65, 0.35)";
const BORDER_DASH: [number, number] = [4, 2]; // [dash-px, gap-px]

// ─── GEOJSON BUILDER ─────────────────────────────────────────────────────────
// Converts scored neighborhood records into a MapLibre GeoJSON FeatureCollection.
//
// COORDINATE FLIP: neighborhoods.ts stores polygons as [lat, lng] (Leaflet
// convention). GeoJSON / MapLibre require [lng, lat], so each pair is reversed.
// Rings are also closed by repeating the first vertex.
//
// FUTURE DATA: If a real API returns pre-formatted GeoJSON polygons, this
// function can be swapped for a direct pass-through. The only requirement
// is that each feature exposes `id`, `name`, and `pillowIndex` as properties.
function toGeoJSON(scored: ScoredNeighborhood[]) {
  return {
    type: "FeatureCollection" as const,
    features: scored.map((n) => ({
      type: "Feature" as const,
      id: n.id,
      properties: {
        id:          n.id,
        name:        n.name,
        pillowIndex: n.pillowIndex,
        // NOTE: fill color is NOT stored here — it is computed by HEAT_SCALE
        // inside the MapLibre layer paint. Keeping data and style separate
        // means the color scheme can be updated without touching the dataset.
      },
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          [
            ...n.polygon.map(([lat, lng]) => [lng, lat] as [number, number]),
            [n.polygon[0][1], n.polygon[0][0]] as [number, number], // close ring
          ],
        ],
      },
    })),
  };
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────
const MapPage = () => {
  const navigate = useNavigate();
  const mapRef          = useRef<maplibregl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [weights, setWeights]                       = useState<Weights>({ ...DEFAULT_WEIGHTS });
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<ScoredNeighborhood | null>(null);
  const [mapLoaded, setMapLoaded]                   = useState(false);

  // Re-scores every neighborhood whenever weight sliders change.
  // pillowIndex is the only value that flows into the map layer.
  const scoredNeighborhoods = useMemo<ScoredNeighborhood[]>(
    () => neighborhoods.map((n) => ({ ...n, pillowIndex: calculatePillowIndex(n.scores, weights) })),
    [weights]
  );

  // ── Initialize map ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style:     MAPTILER_STYLE,
      center:    LA_CENTER,
      zoom:      LA_ZOOM,
    });

    map.on("load", () => {
      // GeoJSON source — updated via setData() on every weight change
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // Thermal fill — color driven by HEAT_SCALE interpolation on pillowIndex
      map.addLayer({
        id:     FILL_LAYER,
        type:   "fill",
        source: SOURCE_ID,
        paint:  {
          "fill-color":   HEAT_SCALE,
          "fill-opacity": 0.7,
        },
      });

      // Neon dashed border — uniform green outline on all neighborhood polygons
      map.addLayer({
        id:     LINE_LAYER,
        type:   "line",
        source: SOURCE_ID,
        paint:  {
          "line-color":      NEON_BORDER,
          "line-width":      1.5,
          "line-dasharray":  BORDER_DASH,
        },
      });

      map.on("mouseenter", FILL_LAYER, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", FILL_LAYER, () => { map.getCanvas().style.cursor = ""; });

      setMapLoaded(true);
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // ── Push updated scores into the GeoJSON source ───────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    (map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource).setData(toGeoJSON(scoredNeighborhoods));
  }, [scoredNeighborhoods, mapLoaded]);

  // ── Hover tooltip ─────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: "pillow-popup" });

    const onMove = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0];
      if (!f) return;
      const { name, pillowIndex } = f.properties as { name: string; pillowIndex: number };
      popup
        .setLngLat(e.lngLat)
        .setHTML(`<strong>${name}</strong><br/>PILLOW INDEX: ${Math.round(pillowIndex)}`)
        .addTo(map);
    };

    const onLeave = () => popup.remove();

    map.on("mousemove", FILL_LAYER, onMove);
    map.on("mouseleave", FILL_LAYER, onLeave);
    return () => {
      map.off("mousemove", FILL_LAYER, onMove);
      map.off("mouseleave", FILL_LAYER, onLeave);
      popup.remove();
    };
  }, [mapLoaded]);

  // ── Click → open detail panel ────────────────────────────────────────────
  // Re-registers on each scoredNeighborhoods update so the handler always
  // closes over the latest pillowIndex values for the detail panel.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const onClick = (e: maplibregl.MapLayerMouseEvent) => {
      const id = e.features?.[0]?.properties?.id as string | undefined;
      if (!id) return;
      const found = scoredNeighborhoods.find((n) => n.id === id);
      if (found) setSelectedNeighborhood(found);
    };

    map.on("click", FILL_LAYER, onClick);
    return () => { map.off("click", FILL_LAYER, onClick); };
  }, [mapLoaded, scoredNeighborhoods]);

  // ── Render ────────────────────────────────────────────────────────────────
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

      {/* Map */}
      <div ref={mapContainerRef} className="h-full w-full" />

      {/* Thermal Legend (bottom-right) */}
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
