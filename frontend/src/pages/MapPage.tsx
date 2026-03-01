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
  neighborhoodByName,
  NeighborhoodData,
  Weights,
  DEFAULT_WEIGHTS,
  calculatePillowIndex,
} from "@/data/neighborhoods";

// ─── GeoJSON GEOMETRY ────────────────────────────────────────────────────────
// Imported as a static module so it's available synchronously at map-load time
// with no fetch/timing issues. Coordinates are already [lng, lat] (GeoJSON standard).
// TO REPLACE WITH REAL DATA: swap this import for an API call that returns a
// GeoJSON FeatureCollection with the same coordinate convention.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import _laGeoJSONRaw from "@/data/la-neighborhoods.json";
const LA_GEOJSON = _laGeoJSONRaw as unknown as GeoJSON.FeatureCollection;

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
// Color stops for the thermal gradient (score 0–100).
// To change the palette, edit the RGB values below — they map 1:1 with the
// gradient shown in the thermal legend in the bottom-right corner.
//
// Score  Hex       Thermal meaning
// ─────  ───────   ───────────────
//   0    #140050   cold   — deep purple
//  25    #5014A0   cool   — violet
//  45    #D01E28   warm   — red
//  65    #E08C14   hot    — orange
//  82    #FFD700   hotter — gold
// 100    #FFFAE0   max    — pale yellow-white
const HEAT_STOPS: Array<[number, [number, number, number]]> = [
  [0,   [20,  0,   80 ]],
  [25,  [80,  20,  160]],
  [45,  [208, 30,  40 ]],
  [65,  [224, 140, 20 ]],
  [82,  [255, 215, 0  ]],
  [100, [255, 250, 224]],
];

// Converts a 0–100 pillowIndex to a hex color via linear interpolation
// across HEAT_STOPS. Pre-computing in JS (rather than using a MapLibre
// expression) avoids any version-specific expression-parsing issues.
function pillowIndexToHex(score: number): string {
  const s = Math.max(0, Math.min(100, score));
  for (let i = 0; i < HEAT_STOPS.length - 1; i++) {
    const [s0, c0] = HEAT_STOPS[i];
    const [s1, c1] = HEAT_STOPS[i + 1];
    if (s <= s1) {
      const t = (s - s0) / (s1 - s0);
      const h = (v: number) => Math.round(v).toString(16).padStart(2, "0");
      return `#${h(c0[0] + t * (c1[0] - c0[0]))}${h(c0[1] + t * (c1[1] - c0[1]))}${h(c0[2] + t * (c1[2] - c0[2]))}`;
    }
  }
  return "#fffae0";
}

// Neon green dashed border — uniform green outline on all neighborhood polygons.
// #39FF14 is standard "electric neon green" — full brightness so borders pop
// against the dark map even on cold (dark purple) fill polygons.
// NOTE: MapLibre's fill-outline-color only draws 1px with no width control.
// For thick/dashed borders a separate line layer is required (LINE_LAYER below).
const NEON_BORDER = "#39FF14";
const BORDER_DASH: [number, number] = [4, 2]; // [dash-px, gap-px]

// ─── SEARCH HELPERS ──────────────────────────────────────────────────────────
// Computes a bounding box from any GeoJSON feature's geometry so the map can
// fitBounds() when a user selects a search result. Handles both Polygon and
// MultiPolygon (the LA GeoJSON uses MultiPolygon exclusively).
function getFeatureBounds(feature: GeoJSON.Feature): maplibregl.LngLatBounds | null {
  const pts: [number, number][] = [];

  const collectRings = (rings: number[][][]) => {
    for (const ring of rings) {
      for (const c of ring) pts.push([c[0], c[1]]);
    }
  };

  if (feature.geometry.type === "Polygon") {
    collectRings(feature.geometry.coordinates as number[][][]);
  } else if (feature.geometry.type === "MultiPolygon") {
    for (const poly of feature.geometry.coordinates as number[][][][]) {
      collectRings(poly as number[][][]);
    }
  }

  if (!pts.length) return null;
  const lngs = pts.map(([lng]) => lng);
  const lats = pts.map(([, lat]) => lat);
  return new maplibregl.LngLatBounds(
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)]
  );
}

// ─── SOURCE DATA BUILDER ──────────────────────────────────────────────────────
// Merges the real GeoJSON geometry with computed pillow scores.
// Neighborhoods present in the GeoJSON but not in the score dataset default
// to pillowIndex: 50 (mid-range / neutral warm tone on the thermal scale).
//
// The GeoJSON uses MultiPolygon geometries with coordinates already in
// [lng, lat] order — no coordinate flipping required.
function buildSourceData(scored: ScoredNeighborhood[]): GeoJSON.FeatureCollection {
  const scoreByName = new Map(scored.map((n) => [n.name, n]));

  return {
    type: "FeatureCollection",
    features: LA_GEOJSON.features.map((feature) => {
      const name = (feature.properties?.name ?? "") as string;
      const match = scoreByName.get(name);
      const pillowIndex = match?.pillowIndex ?? 50;
      return {
        type:       "Feature" as const,
        id:         match?.id ?? name,
        geometry:   feature.geometry,
        properties: {
          id:          match?.id ?? name,
          name,
          pillowIndex,
          fillColor:   pillowIndexToHex(pillowIndex),
        },
      };
    }),
  };
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────
const MapPage = () => {
  const navigate = useNavigate();
  const mapRef          = useRef<maplibregl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [weights, setWeights]                           = useState<Weights>({ ...DEFAULT_WEIGHTS });
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<ScoredNeighborhood | null>(null);
  const [mapLoaded, setMapLoaded]                       = useState(false);
  const [searchQuery, setSearchQuery]                   = useState("");
  const [searchResults, setSearchResults]               = useState<string[]>([]);

  // Re-scores every neighborhood whenever weight sliders change.
  const scoredNeighborhoods = useMemo<ScoredNeighborhood[]>(
    () => neighborhoods.map((n) => ({ ...n, pillowIndex: calculatePillowIndex(n.scores, weights) })),
    [weights]
  );

  // Ref always holds the latest scored list — lets async map callbacks read
  // current data without closure staleness.
  const scoredRef = useRef(scoredNeighborhoods);
  useEffect(() => { scoredRef.current = scoredNeighborhoods; }, [scoredNeighborhoods]);

  // ── Search filter ─────────────────────────────────────────────────────────
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) { setSearchResults([]); return; }

    const nameMatches = LA_GEOJSON.features
      .map((f) => f.properties?.name as string)
      .filter((name) => name?.toLowerCase().includes(q));

    const zipMatches = neighborhoods
      .filter((n) => n.zip.includes(q))
      .map((n) => n.name);

    const seen = new Set<string>();
    const merged: string[] = [];
    for (const name of [...nameMatches, ...zipMatches]) {
      if (!seen.has(name)) { seen.add(name); merged.push(name); }
      if (merged.length === 8) break;
    }
    setSearchResults(merged);
  }, [searchQuery]);

  // ── Select neighborhood from search ──────────────────────────────────────
  const handleSelectNeighborhood = (name: string) => {
    setSearchQuery("");
    setSearchResults([]);

    const map = mapRef.current;
    if (!map) return;

    const feature = LA_GEOJSON.features.find((f) => f.properties?.name === name);
    if (feature) {
      const bounds = getFeatureBounds(feature);
      if (bounds) map.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 800 });
    }

    const base = neighborhoodByName.get(name);
    if (!base) return;
    const scored = scoredNeighborhoods.find((n) => n.id === base.id);
    if (scored) setSelectedNeighborhood(scored);
  };

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
      // Source is populated immediately with scored data — no async wait needed
      // because LA_GEOJSON is a synchronous module import.
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: buildSourceData(scoredRef.current),
      });

      // Thermal fill — color read from the pre-computed fillColor feature property
      map.addLayer({
        id:     FILL_LAYER,
        type:   "fill",
        source: SOURCE_ID,
        paint:  {
          "fill-color":   ["get", "fillColor"],
          "fill-opacity": 0.7,
        },
      });

      // Neon dashed border — uniform green outline on all neighborhood polygons
      map.addLayer({
        id:     LINE_LAYER,
        type:   "line",
        source: SOURCE_ID,
        paint:  {
          "line-color":     NEON_BORDER,
          "line-width":     2,
          "line-dasharray": BORDER_DASH,
        },
      });

      map.on("mouseenter", FILL_LAYER, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", FILL_LAYER, () => { map.getCanvas().style.cursor = ""; });

      setMapLoaded(true);
    });

    mapRef.current = map;

    return () => {
      // Reset mapLoaded so the source-update effect re-runs if React Strict Mode
      // mounts a second map instance (dev-only double-invocation). Without this
      // reset, setMapLoaded(true) from the second map fires with no state change
      // and the effect never re-triggers, leaving the source empty.
      setMapLoaded(false);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Push updated scores into the source when weights change ──────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    source?.setData(buildSourceData(scoredNeighborhoods));
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
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const onClick = (e: maplibregl.MapLayerMouseEvent) => {
      const name = e.features?.[0]?.properties?.name as string | undefined;
      if (!name) return;
      const base = neighborhoodByName.get(name);
      if (!base) return;
      const found = scoredNeighborhoods.find((n) => n.id === base.id);
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
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchResults[0]) handleSelectNeighborhood(searchResults[0]);
              if (e.key === "Escape") { setSearchQuery(""); setSearchResults([]); }
            }}
            onBlur={() => setTimeout(() => setSearchResults([]), 150)}
            placeholder="SEARCH NEIGHBORHOOD / ZIP ..."
            className="w-full px-3 sm:px-4 py-2 rounded bg-muted border border-border text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all tracking-wider uppercase"
          />
          {searchResults.length > 0 && (
            <ul className="absolute top-full left-0 right-0 mt-1 rounded border border-border bg-background/95 backdrop-blur-md overflow-hidden z-[1001]">
              {searchResults.map((name) => (
                <li key={name}>
                  <button
                    onMouseDown={() => handleSelectNeighborhood(name)}
                    className="w-full text-left px-3 py-2 text-[11px] font-mono tracking-wide text-foreground/80 hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    {name}
                    {neighborhoodByName.has(name) && (
                      <span className="ml-2 text-[9px] text-primary/40 tracking-widest">SCORED</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
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
