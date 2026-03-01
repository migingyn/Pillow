import { useEffect, useRef, useState } from "react";
import mapboxgl, { type ExpressionSpecification } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { AnimatePresence } from "framer-motion";
import { Crosshair, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import FilterSidebar from "@/components/FilterSidebar";
import CensusBlockPanel, { type CensusBlockData } from "@/components/CensusBlockPanel";
import { Weights, DEFAULT_WEIGHTS, FactorSelections, DEFAULT_SELECTIONS } from "@/data/neighborhoods";

// ─── MAP VIEWPORT ────────────────────────────────────────────────────────────
const LA_CENTER: [number, number] = [-118.2437, 34.0522];
const LA_ZOOM = 9.5;
const MAPBOX_STYLE = "mapbox://styles/mapbox/dark-v11";

// ─── SCORE COLOR SCHEME ──────────────────────────────────────────────────────
// We are pivoting away from "heatmap" colors.
// High score => dark green. Mid => yellow. Too low => black.
const SCORE_CUTOFF = 0.2; // raise for more black, lower for less black

const COLOR_OFF = "rgba(0, 0, 0, 0)" // below cutoff; fully transparent
const COLOR_STOP_1 = "#fef9c3"; // light yellow
const COLOR_STOP_2 = "#facc15"; // yellow
const COLOR_STOP_3 = "#14532d"; // dark green

// Build a Mapbox GL fill-color expression driven by weighted score (0-1).
// Factors with data:
//   walkability → score_walkability  (scores_la)
//   transit     → score_transit      (scores_la)
//   traffic     → score_vmt          (scores_la, higher = less car-dependent)
//   price       → score_price        (affordability_scores, higher = more affordable)
//   floodRisk   → score_flood_safe   (nri_risk_scores, inverted: 1 - score_flood)
//   quakeRisk   → score_quake_safe   (nri_risk_scores, inverted: 1 - score_earthquake)
//   wildfireRisk→ score_wildfire_safe(nri_risk_scores, inverted: 1 - score_wildfire)
//   airQuality  → score_air_safe     (calenviroscreen, inverted: 1 - air_quality_composite)
function buildColorExpr(weights: Weights, selections: FactorSelections): ExpressionSpecification {
  // Normalize weights to 0..1, but if slider is OFF (0), exclude it entirely
const wPrice = weights.price > 0 ? weights.price / 5 : 0;

const wWalk =
  selections.livability.walkability && weights.walkability > 0 ? weights.walkability / 5 : 0;

const wTransit =
  selections.livability.transit && weights.transit > 0 ? weights.transit / 5 : 0;

// traffic isn't in dropdown, but still should disappear when slider is 0
const wTraffic = weights.traffic > 0 ? weights.traffic / 5 : 0;

// Environmental slider: if it's 0, exclude all env terms entirely
const envTotal = weights.environmentalRisks > 0 ? weights.environmentalRisks / 5 : 0;
const { floodRisk, earthquakeRisk, wildfireRisk, airQuality } = selections.environmental;

const envSelectedCount = [floodRisk, earthquakeRisk, wildfireRisk, airQuality].filter(Boolean).length;

// If env slider is OFF or nothing selected, env weights all go to 0
const envCount = envTotal > 0 && envSelectedCount > 0 ? envSelectedCount : 1;

const wFlood = envTotal > 0 && floodRisk ? envTotal / envCount : 0;
const wQuake = envTotal > 0 && earthquakeRisk ? envTotal / envCount : 0;
const wFire  = envTotal > 0 && wildfireRisk ? envTotal / envCount : 0;
const wAir   = envTotal > 0 && airQuality ? envTotal / envCount : 0;

const denom = wPrice + wWalk + wTransit + wTraffic + wFlood + wQuake + wFire + wAir;

  // Base score expression (0..1). If denom==0, fall back to composite.
  const baseScoreExpr: ExpressionSpecification =
    denom === 0
      ? (["coalesce", ["to-number", ["get", "composite"]], 0] as ExpressionSpecification)
      : ([
          "/",
          [
            "+",
            ["*", wPrice,   ["coalesce", ["to-number", ["get", "score_price"]],         0.5]],
            ["*", wWalk,    ["coalesce", ["to-number", ["get", "score_walkability"]],   0.5]],
            ["*", wTransit, ["coalesce", ["to-number", ["get", "score_transit"]],       0.5]],
            ["*", wTraffic, ["coalesce", ["to-number", ["get", "score_vmt"]],           0.5]],
            ["*", wFlood,   ["coalesce", ["to-number", ["get", "score_flood_safe"]],    0.5]],
            ["*", wQuake,   ["coalesce", ["to-number", ["get", "score_quake_safe"]],    0.5]],
            ["*", wFire,    ["coalesce", ["to-number", ["get", "score_wildfire_safe"]], 0.5]],
            ["*", wAir,     ["coalesce", ["to-number", ["get", "score_air_safe"]],      0.5]],
          ],
          denom,
        ] as ExpressionSpecification);

  // ✅ Final color: below cutoff = black, else smooth 4-stop yellow→green
  return [
    "case",
    ["<", baseScoreExpr, SCORE_CUTOFF],
    COLOR_OFF,
    [
      "interpolate",
      ["linear"],
      baseScoreExpr,
      SCORE_CUTOFF, COLOR_STOP_1, // light yellow
      0.42,        COLOR_STOP_2,  // yellow
      0.55,        "#84cc16",     // yellow-green
      0.80,         COLOR_STOP_3,  // dark green
    ],
  ] as ExpressionSpecification;
}

// ─── GEOCODING ────────────────────────────────────────────────────────────────
// Bounding box covering Los Angeles County + Orange County
const LA_OC_BBOX = "-118.95,33.40,-117.40,34.85";

interface GeocodingFeature {
  id: string;
  place_name: string;
  place_type: string[];
  center: [number, number]; // [lng, lat]
}

// ─── DATA TYPES ───────────────────────────────────────────────────────────────
interface AffordProps { score_affordability: number | null }
interface NriProps    { score_flood: number; score_earthquake: number; score_wildfire: number }
interface CesProps    { air_quality_composite: number | null }

// ─── COMPONENT ───────────────────────────────────────────────────────────────
const MapPage = () => {
  const navigate        = useNavigate();
  const mapRef          = useRef<mapboxgl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const clickedIdRef    = useRef<string | number | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const weightsRef    = useRef<Weights>({ ...DEFAULT_WEIGHTS });
  const selectionsRef = useRef<FactorSelections>({ ...DEFAULT_SELECTIONS });

  const [weights, setWeights]         = useState<Weights>({ ...DEFAULT_WEIGHTS });
  const [selections, setSelections]   = useState<FactorSelections>({ ...DEFAULT_SELECTIONS });

  // Keep refs in sync so map event handler closures always see current values
  weightsRef.current    = weights;
  selectionsRef.current = selections;
  const [mapLoaded, setMapLoaded]     = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [clickedBlock, setClickedBlock] = useState<CensusBlockData | null>(null);
  const [searchQuery, setSearchQuery]   = useState("");
  const [suggestions, setSuggestions]   = useState<GeocodingFeature[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);

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

    map.on("load", async () => {
      setDataLoading(true);

      // ── Fetch and merge all three datasets ────────────────────────────────
      let scoresGeo: { type: string; features: { properties: Record<string, unknown>; [k: string]: unknown }[] };

      try {
        const [scoresRaw, affordRaw, nriRaw, cesRaw] = await Promise.all([
          fetch("/scores_la.geojson").then(r => r.json()),
          fetch("/affordability_scores.geojson").then(r => r.json()),
          fetch("/nri_risk_scores.geojson").then(r => r.json()),
          fetch("/calenviroscreen_air_quality.geojson").then(r => r.json()),
        ]);

        // Build tract-level lookup maps.
        // affordability & NRI use 11-digit tract_fips (with leading 0).
        // CalEnviroScreen census_tract is 10-digit (missing leading 0) → pad to 11.
        const affordMap = new Map<string, AffordProps>();
        for (const f of (affordRaw.features as { properties: AffordProps & { tract_fips?: string } }[])) {
          if (f.properties?.tract_fips) affordMap.set(f.properties.tract_fips, f.properties);
        }

        const nriMap = new Map<string, NriProps>();
        for (const f of (nriRaw.features as { properties: NriProps & { tract_fips?: string } }[])) {
          if (f.properties?.tract_fips) nriMap.set(f.properties.tract_fips, f.properties);
        }

        const cesMap = new Map<string, CesProps>();
        for (const f of (cesRaw.features as { properties: CesProps & { census_tract?: string } }[])) {
          const raw = f.properties?.census_tract;
          if (raw) cesMap.set(raw.padStart(11, "0"), f.properties);
        }

        // Enrich each census block feature with tract-level data.
        // Census block GEOID20 (12 chars) → tract FIPS = first 11 chars.
        scoresGeo = scoresRaw;
        for (const feat of scoresGeo.features) {
          const geoid = feat.properties?.GEOID20;
          const tract = typeof geoid === "string" ? geoid.slice(0, 11) : null;
          const afford = tract ? affordMap.get(tract) : undefined;
          const nri    = tract ? nriMap.get(tract)    : undefined;
          const ces    = tract ? cesMap.get(tract)    : undefined;

          feat.properties.score_price         = afford?.score_affordability ?? null;
          feat.properties.score_flood_safe    = nri != null ? 1 - nri.score_flood       : null;
          feat.properties.score_quake_safe    = nri != null ? 1 - nri.score_earthquake  : null;
          feat.properties.score_wildfire_safe = nri != null ? 1 - nri.score_wildfire    : null;
          feat.properties.score_air_safe      = ces?.air_quality_composite != null
            ? 1 - ces.air_quality_composite
            : null;
        }
      } catch (err) {
        console.warn("Failed to load supplemental data, falling back to scores only:", err);
        scoresGeo = await fetch("/scores_la.geojson").then(r => r.json());
      }

      // ── GeoJSON source: census blocks with enriched fields ────────────────
      map.addSource("census-blocks", {
        type:       "geojson",
        data:       scoresGeo as unknown as GeoJSON.FeatureCollection,
        generateId: true,
      });

      // Find the first symbol layer so census layers are inserted below all labels
      const firstSymbolId = map.getStyle().layers.find(l => l.type === "symbol")?.id;

      // Blocks to hide (water/non-residential artifacts)
      const EXCLUDED_GEOIDS = ["060379901000", "060379902000", "060379903000", "060599901000", "060375991001"];
      const blockFilter: ExpressionSpecification = [
        "!", ["in", ["get", "GEOID20"], ["literal", EXCLUDED_GEOIDS]],
      ];

      // ── Thermal fill layer ───────────────────────────────────────────────
      map.addLayer({
        id:     "census-heat",
        type:   "fill",
        source: "census-blocks",
        filter: blockFilter,
        paint:  {
          "fill-color":   buildColorExpr(DEFAULT_WEIGHTS, DEFAULT_SELECTIONS),
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "clicked"], false], 0.95,
            ["boolean", ["feature-state", "hover"],   false], 0.88,
            0.72,
          ],
        },
      }, firstSymbolId);

      // ── Block borders ────────────────────────────────────────────────────
      map.addLayer({
        id:     "census-outline",
        type:   "line",
        source: "census-blocks",
        filter: blockFilter,
        paint:  {
          "line-color": "rgba(0, 0, 0, 0.18)",
          "line-width": 0.3,
        },
      }, firstSymbolId);

      // ── Clicked block highlight border ───────────────────────────────────
      map.addLayer({
        id:     "census-clicked-outline",
        type:   "line",
        source: "census-blocks",
        paint:  {
          "line-color": [
            "case",
            ["boolean", ["feature-state", "clicked"], false], "rgba(255,255,255,0.6)",
            "transparent",
          ],
          "line-width": 1.5,
        },
      }, firstSymbolId);

      // ── Boost city label visibility above the thermal fill ───────────────
      map.getStyle().layers
        .filter(l => l.type === "symbol")
        .forEach(l => {
          const isRoad = l.id.includes("road") || l.id.includes("street") || l.id.includes("highway");
          map.setPaintProperty(l.id, "text-color", isRoad ? "rgba(255,255,255,0.3)" : "#ffffff");
          map.setPaintProperty(l.id, "text-halo-color", "rgba(0,0,0,0.85)");
          map.setPaintProperty(l.id, "text-halo-width", isRoad ? 0 : 2);
        });

      // ── Hover popup ──────────────────────────────────────────────────────
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: "locus-popup",
        offset:    8,
      });

      let hoveredId: string | number | null = null;

      map.on("mousemove", "census-heat", (e) => {
        if (!e.features?.length) return;
        map.getCanvas().style.cursor = "crosshair";

        const feat  = e.features[0];
        const p     = feat.properties as Record<string, number | string | null>;

        // Highlight hovered feature
        if (hoveredId !== null)
          map.setFeatureState({ source: "census-blocks", id: hoveredId }, { hover: false });
        hoveredId = feat.id ?? null;
        if (hoveredId !== null)
          map.setFeatureState({ source: "census-blocks", id: hoveredId }, { hover: true });

        const n = (v: unknown, def = 0.5) => {
          if (typeof v === "number") return v;
          if (typeof v === "string") { const x = parseFloat(v); return isNaN(x) ? def : x; }
          return def;
        };
        const pct = (v: number) => (v * 100).toFixed(0);

        // Compute weighted composite using current weight state via refs
        const w = weightsRef.current;
        const s = selectionsRef.current;
        const wP  = w.price / 5;
        const wWk = s.livability.walkability ? w.walkability / 5 : 0;
        const wTr = s.livability.transit     ? w.transit     / 5 : 0;
        const wTf = w.traffic / 5;
        const envTotal = w.environmentalRisks / 5;
        const { floodRisk, earthquakeRisk, wildfireRisk, airQuality } = s.environmental;
        const envCount = [floodRisk, earthquakeRisk, wildfireRisk, airQuality].filter(Boolean).length || 1;
        const wFl = floodRisk      ? envTotal / envCount : 0;
        const wQk = earthquakeRisk ? envTotal / envCount : 0;
        const wFr = wildfireRisk   ? envTotal / envCount : 0;
        const wAr = airQuality     ? envTotal / envCount : 0;
        const dyn_denom = wP + wWk + wTr + wTf + wFl + wQk + wFr + wAr;
        const dynamicComposite = dyn_denom === 0
          ? n(p.composite)
          : (wP * n(p.score_price) + wWk * n(p.score_walkability) + wTr * n(p.score_transit) +
             wTf * n(p.score_vmt)  + wFl * n(p.score_flood_safe)  + wQk * n(p.score_quake_safe) +
             wFr * n(p.score_wildfire_safe) + wAr * n(p.score_air_safe)) / dyn_denom;

        popup
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="line-height:1.7">
              <div style="color:rgba(0,255,0,0.45);font-size:9px;letter-spacing:.12em;margin-bottom:3px">CENSUS BLOCK</div>
              <div style="font-size:9px;opacity:.5;margin-bottom:5px">${p.GEOID20 ?? "–"}</div>
              <div>COMPOSITE&nbsp;<span style="color:#FFD700;font-weight:600">${pct(dynamicComposite)}</span>&nbsp;·&nbsp;AFFORD&nbsp;<span style="color:#aaffaa">${pct(n(p.score_price))}</span></div>
              <div style="opacity:.75">WALK&nbsp;<span style="color:#aaffaa">${pct(n(p.score_walkability))}</span>&nbsp;·&nbsp;TRANSIT&nbsp;<span style="color:#aaffaa">${pct(n(p.score_transit))}</span>&nbsp;·&nbsp;VMT&nbsp;<span style="color:#aaffaa">${pct(n(p.score_vmt))}</span></div>
              <div style="opacity:.75">FLOOD&nbsp;<span style="color:#aaffaa">${pct(n(p.score_flood_safe))}</span>&nbsp;·&nbsp;QUAKE&nbsp;<span style="color:#aaffaa">${pct(n(p.score_quake_safe))}</span></div>
              <div style="opacity:.75">FIRE&nbsp;<span style="color:#aaffaa">${pct(n(p.score_wildfire_safe))}</span>&nbsp;·&nbsp;AIR&nbsp;<span style="color:#aaffaa">${pct(n(p.score_air_safe))}</span></div>
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

      // ── Click handler — opens detail panel ───────────────────────────────
      map.on("click", "census-heat", (e) => {
        if (!e.features?.length) return;
        const feat = e.features[0];
        const p    = feat.properties as Record<string, number | string | null>;

        // Clear previous clicked highlight
        if (clickedIdRef.current !== null)
          map.setFeatureState({ source: "census-blocks", id: clickedIdRef.current }, { clicked: false });

        clickedIdRef.current = feat.id ?? null;
        if (clickedIdRef.current !== null)
          map.setFeatureState({ source: "census-blocks", id: clickedIdRef.current }, { clicked: true });

        const num    = (v: unknown) => typeof v === "number" ? v : 0;
        const numDef = (v: unknown, def = 0.5) => typeof v === "number" ? v : def;

        setClickedBlock({
          geoid:        String(p.GEOID20 ?? ""),
          walkability:  num(p.score_walkability),
          transit:      num(p.score_transit),
          vmt:          num(p.score_vmt),
          composite:    num(p.composite),
          price:        numDef(p.score_price),
          floodSafe:    numDef(p.score_flood_safe),
          quakeSafe:    numDef(p.score_quake_safe),
          fireSafe:     numDef(p.score_wildfire_safe),
          airSafe:      numDef(p.score_air_safe),
          lat:          e.lngLat.lat,
          lng:          e.lngLat.lng,
        });
      });

      setDataLoading(false);
      setMapLoaded(true);
    });

    map.on("error", () => setDataLoading(false));

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // ── Re-color heatmap whenever weights or selections change ────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !map.getLayer("census-heat")) return;
    map.setPaintProperty("census-heat", "fill-color", buildColorExpr(weights, selections));
  }, [weights, selections, mapLoaded]);

  // ── Search: debounced Mapbox Geocoding API call ───────────────────────────
  const handleSearchInput = (q: string) => {
    setSearchQuery(q);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (q.trim().length < 2) { setSuggestions([]); return; }
    searchDebounceRef.current = setTimeout(async () => {
      const token = import.meta.env.VITE_MAPBOX_TOKEN;
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q.trim())}.json?access_token=${token}&bbox=${LA_OC_BBOX}&types=place,neighborhood,locality,postcode&limit=5&country=US`;
      try {
        const res  = await fetch(url);
        const data = await res.json() as { features?: GeocodingFeature[] };
        setSuggestions(data.features ?? []);
      } catch { setSuggestions([]); }
    }, 300);
  };

  // ── Search: fly to selected result, then auto-open census block panel ─────
  const handleSearchSelect = (feat: GeocodingFeature) => {
    const map = mapRef.current;
    if (!map) return;

    setSearchQuery(feat.place_name.split(",")[0]);
    setSuggestions([]);
    setSearchFocused(false);

    const center: [number, number] = feat.center;
    const zoom = feat.place_type.includes("neighborhood") ? 14
               : feat.place_type.includes("locality")     ? 13
               : 12;

    map.flyTo({ center, zoom, duration: 1600, essential: true });

    // After the map is fully idle (animation done + tiles rendered), open panel
    map.once("idle", () => {
      const point    = map.project(center);
      const features = map.queryRenderedFeatures(point, { layers: ["census-heat"] });
      if (!features.length) return;

      const f = features[0];
      const p = f.properties as Record<string, number | string | null>;
      const num    = (v: unknown) => typeof v === "number" ? v : 0;
      const numDef = (v: unknown, def = 0.5) => typeof v === "number" ? v : def;

      if (clickedIdRef.current !== null)
        map.setFeatureState({ source: "census-blocks", id: clickedIdRef.current }, { clicked: false });
      clickedIdRef.current = f.id ?? null;
      if (clickedIdRef.current !== null)
        map.setFeatureState({ source: "census-blocks", id: clickedIdRef.current }, { clicked: true });

      setClickedBlock({
        geoid:        String(p.GEOID20 ?? ""),
        walkability:  num(p.score_walkability),
        transit:      num(p.score_transit),
        vmt:          num(p.score_vmt),
        composite:    num(p.composite),
        price:        numDef(p.score_price),
        floodSafe:    numDef(p.score_flood_safe),
        quakeSafe:    numDef(p.score_quake_safe),
        fireSafe:     numDef(p.score_wildfire_safe),
        airSafe:      numDef(p.score_air_safe),
        lat:          center[1],
        lng:          center[0],
      });
    });
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && suggestions.length > 0) handleSearchSelect(suggestions[0]);
    if (e.key === "Escape") { setSuggestions([]); setSearchFocused(false); }
  };

  // ── Close panel and clear clicked feature-state ───────────────────────────
  const handleBlockClose = () => {
    const map = mapRef.current;
    if (map && clickedIdRef.current !== null && map.getLayer("census-heat")) {
      map.setFeatureState({ source: "census-blocks", id: clickedIdRef.current }, { clicked: false });
      clickedIdRef.current = null;
    }
    setClickedBlock(null);
  };

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
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={e => handleSearchInput(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            onKeyDown={handleSearchKeyDown}
            placeholder="SEARCH NEIGHBORHOOD / ZIP ..."
            className="w-full px-3 sm:px-4 py-2 rounded bg-muted border border-border text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all tracking-wider uppercase"
          />
          {searchFocused && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded border border-border bg-background/95 backdrop-blur-md overflow-hidden shadow-lg z-10">
              {suggestions.map(feat => (
                <button
                  key={feat.id}
                  onMouseDown={() => handleSearchSelect(feat)}
                  className="w-full text-left px-3 py-2.5 text-[11px] font-mono text-foreground/80 hover:bg-primary/10 hover:text-foreground transition-colors border-b border-border/40 last:border-0 tracking-wide"
                >
                  {feat.place_name}
                </button>
              ))}
            </div>
          )}
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
        <p className="text-[9px] font-mono text-primary/70 mb-2 tracking-widest uppercase">Scoring Index</p>
        <div className="thermal-gradient-bar h-2.5 w-32 sm:w-40 rounded-sm" />
        <div className="flex justify-between text-[8px] font-mono text-muted-foreground mt-1 tracking-wider">
          <span>WORST</span>
          <span>BEST</span>
        </div>
      </div>
      <FilterSidebar
        weights={weights}
        onWeightsChange={setWeights}
        selections={selections}
        onSelectionsChange={setSelections}
      />

      {/* Census block detail panel */}
      <AnimatePresence>
        {clickedBlock && (
          <CensusBlockPanel
            key={clickedBlock.geoid}
            block={clickedBlock}
            weights={weights}
            selections={selections}
            onClose={handleBlockClose}
          />
        )}
      </AnimatePresence>

    </div>
  );
};

export default MapPage;
