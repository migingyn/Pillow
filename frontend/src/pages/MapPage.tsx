import { useEffect, useRef, useState } from "react";
import mapboxgl, { type ExpressionSpecification } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Crosshair, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import FilterSidebar from "@/components/FilterSidebar";
import { Weights, DEFAULT_WEIGHTS } from "@/data/neighborhoods";

// ─── MAP VIEWPORT ────────────────────────────────────────────────────────────
const LA_CENTER: [number, number] = [-118.2437, 34.0522];
const LA_ZOOM = 9.5;
const MAPBOX_STYLE = "mapbox://styles/mapbox/dark-v11";

// ─── THERMAL COLOR STOPS (matches thermal-gradient-bar in styles.css) ────────
// Score range 0-1: cold (dark purple) → hot (pale yellow)
const THERMAL_STOPS: [number, string][] = [
  [0,    "#140050"],
  [0.25, "#5014A0"],
  [0.5,  "#D01E28"],
  [0.65, "#E08C14"],
  [0.8,  "#FFD700"],
  [1,    "#FFFAE0"],
];

// Build a Mapbox GL fill-color expression driven by weighted score (0-1)
// Mapped fields — scores_la.geojson (all 0-1, higher = better):
//   walkability → score_walkability
//   transit     → score_transit
//   traffic     → score_vmt (higher = less car-dependent = better)
// Falls back to pre-computed composite when all three weights are zero.
function buildColorExpr(weights: Weights): ExpressionSpecification {
  const wWalk    = weights.walkability / 5;
  const wTransit = weights.transit     / 5;
  const wTraffic = weights.traffic     / 5;
  const denom    = wWalk + wTransit + wTraffic;

  const scoreExpr =
    denom === 0
      ? ["get", "composite"]
      : ["/",
          ["+",
            ["*", wWalk,    ["get", "score_walkability"]],
            ["*", wTransit, ["get", "score_transit"]],
            ["*", wTraffic, ["get", "score_vmt"]],
          ],
          denom,
        ];

  return [
    "interpolate", ["linear"], scoreExpr,
    ...THERMAL_STOPS.flatMap(([stop, color]) => [stop, color]),
  ] as ExpressionSpecification;
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────
const MapPage = () => {
  const navigate        = useNavigate();
  const mapRef          = useRef<mapboxgl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [weights, setWeights]         = useState<Weights>({ ...DEFAULT_WEIGHTS });
  const [mapLoaded, setMapLoaded]     = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  // ── Initialize map ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) { console.error("VITE_MAPBOX_TOKEN is not set in .env"); return; }
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style:     MAPBOX_STYLE,
      center:    LA_CENTER,
      zoom:      LA_ZOOM,
      antialias: true,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");

    map.on("load", () => {
      setDataLoading(true);

      // ── GeoJSON source: 8,248 census blocks with pre-scored fields ───────
      map.addSource("census-blocks", {
        type:       "geojson",
        data:       "/scores_la.geojson",
        generateId: true,   // sequential ids for feature-state (hover highlight)
      });

      // Find the first symbol layer so census layers are inserted below all labels
      const firstSymbolId = map.getStyle().layers.find(l => l.type === "symbol")?.id;

      // ── Thermal fill layer ───────────────────────────────────────────────
      map.addLayer({
        id:     "census-heat",
        type:   "fill",
        source: "census-blocks",
        paint:  {
          "fill-color":   buildColorExpr(DEFAULT_WEIGHTS),
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            0.88,
            0.72,
          ],
        },
      }, firstSymbolId);

      // ── Block borders ────────────────────────────────────────────────────
      map.addLayer({
        id:     "census-outline",
        type:   "line",
        source: "census-blocks",
        paint:  {
          "line-color": "rgba(0, 0, 0, 0.18)",
          "line-width": 0.3,
        },
      }, firstSymbolId);

      // ── Boost city label visibility above the thermal fill ───────────────
      map.getStyle().layers
        .filter(l => l.type === "symbol")
        .forEach(l => {
          map.setPaintProperty(l.id, "text-color", "#ffffff");
          map.setPaintProperty(l.id, "text-halo-color", "rgba(0,0,0,0.85)");
          map.setPaintProperty(l.id, "text-halo-width", 2);
        });

      // ── Hover popup ──────────────────────────────────────────────────────
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: "pillow-popup",
        offset:    8,
      });

      let hoveredId: string | number | null = null;

      map.on("mousemove", "census-heat", (e) => {
        if (!e.features?.length) return;
        map.getCanvas().style.cursor = "crosshair";

        const feat  = e.features[0];
        const p     = feat.properties as Record<string, number | string>;

        // Highlight hovered feature
        if (hoveredId !== null)
          map.setFeatureState({ source: "census-blocks", id: hoveredId }, { hover: false });
        hoveredId = feat.id ?? null;
        if (hoveredId !== null)
          map.setFeatureState({ source: "census-blocks", id: hoveredId }, { hover: true });

        const pct = (v: unknown) =>
          typeof v === "number" ? (v * 100).toFixed(0) : "–";

        popup
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="line-height:1.7">
              <div style="color:rgba(0,255,0,0.45);font-size:9px;letter-spacing:.12em;margin-bottom:3px">CENSUS BLOCK</div>
              <div style="font-size:9px;opacity:.5;margin-bottom:5px">${p.GEOID20 ?? "–"}</div>
              <div>COMPOSITE&nbsp;<span style="color:#FFD700;font-weight:600">${pct(p.composite)}</span></div>
              <div style="opacity:.75">WALK&nbsp;<span style="color:#aaffaa">${pct(p.score_walkability)}</span>&nbsp;·&nbsp;TRANSIT&nbsp;<span style="color:#aaffaa">${pct(p.score_transit)}</span></div>
              <div style="opacity:.75">VMT&nbsp;<span style="color:#aaffaa">${pct(p.score_vmt)}</span>&nbsp;·&nbsp;JOBS&nbsp;<span style="color:#aaffaa">${pct(p.score_employment)}</span></div>
            </div>
          `)
          .addTo(map);
      });

      map.on("mouseleave", "census-heat", () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
        if (hoveredId !== null) {
          map.setFeatureState({ source: "census-blocks", id: hoveredId }, { hover: false });
          hoveredId = null;
        }
      });

      // Dismiss loading indicator once GeoJSON data is fully parsed
      map.on("sourcedata", (e) => {
        const evt = e as mapboxgl.MapSourceDataEvent;
        if (evt.sourceId === "census-blocks" && evt.isSourceLoaded)
          setDataLoading(false);
      });

      setMapLoaded(true);
    });

    map.on("error", () => setDataLoading(false));

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // ── Re-color heatmap whenever weights change ──────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !map.getLayer("census-heat")) return;
    map.setPaintProperty("census-heat", "fill-color", buildColorExpr(weights));
  }, [weights, mapLoaded]);

  // ── Token guard ───────────────────────────────────────────────────────────
  if (!import.meta.env.VITE_MAPBOX_TOKEN) {
    return (
      <div className="h-dvh w-screen flex flex-col items-center justify-center bg-background gap-3 px-6 text-center">
        <Crosshair className="h-8 w-8 text-primary/40" />
        <p className="font-mono text-sm text-foreground">Missing Mapbox token</p>
        <p className="font-mono text-xs text-muted-foreground max-w-sm leading-relaxed">
          Add <span className="text-primary">VITE_MAPBOX_TOKEN</span> to your{" "}
          <span className="text-primary">.env</span> file, then restart the dev server.
        </p>
      </div>
    );
  }

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
            readOnly
          />
        </div>
        {dataLoading && (
          <div className="flex items-center gap-1.5 shrink-0">
            <Loader2 className="h-3.5 w-3.5 text-primary/60 animate-spin" />
            <span className="text-[10px] font-mono text-primary/60 hidden sm:inline tracking-widest">LOADING DATA…</span>
          </div>
        )}
      </div>

      {/* Map */}
      <div ref={mapContainerRef} className="h-full w-full" />

      {/* Thermal Legend (bottom-right, above nav control) */}
      <div className="absolute bottom-24 sm:bottom-28 right-3 z-[999] p-2.5 sm:p-3 rounded bg-background/90 border border-border backdrop-blur-md neon-border">
        <p className="text-[9px] font-mono text-primary/70 mb-2 tracking-widest uppercase">Thermal Index</p>
        <div className="thermal-gradient-bar h-2.5 w-32 sm:w-40 rounded-sm" />
        <div className="flex justify-between text-[8px] font-mono text-muted-foreground mt-1 tracking-wider">
          <span>COLD</span>
          <span>HOT</span>
        </div>
      </div>

      <FilterSidebar weights={weights} onWeightsChange={setWeights} />

    </div>
  );
};

export default MapPage;
