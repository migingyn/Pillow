#!/usr/bin/env python3
"""
nri_to_geojson.py
-----------------
Converts FEMA National Risk Index (NRI) census tract CSV to GeoJSON,
extracting wildfire, flood, and earthquake risk scores plus a composite.

Inputs
------
  NRI_Table_CensusTracts.csv   — NRI data (TRACTFIPS has a leading apostrophe)
  census_tracts.geojson        — Census tract geometries keyed by GEOID/TRACTCE
                                 (download from Census TIGER or use your own)

Output
------
  nri_risk_scores.geojson      — One feature per tract with risk properties

Score fields used (all are national percentile 0–100, higher = more risk)
----------------------------------------------------------------------
  Wildfire  : WFIR_RISKS
  Flood     : max(IFLD_RISKS, CFLD_RISKS)   inland + coastal flood
  Earthquake: ERQK_RISKS
  Composite : equal-weight average of the three above (normalised to 0–1)

Usage
-----
  # Scores-only GeoJSON (no geometry, useful for joining later):
  python3 nri_to_geojson.py --csv NRI_Table_CensusTracts.csv --no-geometry

  # Full GeoJSON with geometry:
  python3 nri_to_geojson.py --csv NRI_Table_CensusTracts.csv \
                             --tracts census_tracts.geojson

  # Filter to a single state (FIPS prefix), e.g. California = 06:
  python3 nri_to_geojson.py --csv NRI_Table_CensusTracts.csv \
                             --tracts census_tracts.geojson \
                             --state 06
"""

import csv
import json
import argparse
import sys
from pathlib import Path


# ── helpers ──────────────────────────────────────────────────────────────────

def clean_fips(raw: str) -> str:
    """Strip leading apostrophe and whitespace, zero-pad to 11 digits."""
    fips = raw.lstrip("'").strip()
    return fips.zfill(11)


def to_float(val: str, default: float = 0.0) -> float:
    """Parse a numeric string; return default on empty / non-numeric."""
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def percentile_to_unit(score: float) -> float:
    """Convert a 0–100 percentile score to a 0–1 float."""
    return round(max(0.0, min(100.0, score)) / 100.0, 6)


# ── main ─────────────────────────────────────────────────────────────────────

def build_score_lookup(csv_path: str, state_filter: str | None) -> dict:
    """
    Read the NRI CSV and return a dict keyed by 11-digit TRACTFIPS:
      {
        "06037101110": {
          "score_wildfire":   0.949,
          "score_flood":      0.688,
          "score_earthquake": 0.914,
          "score_composite":  0.850,
          "wildfire_rating":  "Relatively High",
          "flood_rating":     "Relatively Moderate",
          "earthquake_rating":"Relatively High",
          "overall_rating":   "Relatively High",
          "state_fips":       "06",
          "county_fips":      "037",
        },
        ...
      }
    """
    lookup = {}
    skipped = 0

    with open(csv_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)

        # Validate required columns exist
        required = {"TRACTFIPS", "WFIR_RISKS", "IFLD_RISKS", "CFLD_RISKS",
                    "ERQK_RISKS", "WFIR_RISKR", "IFLD_RISKR", "ERQK_RISKR",
                    "RISK_SCORE", "RISK_RATNG"}
        missing = required - set(reader.fieldnames or [])
        if missing:
            print(f"[ERROR] CSV is missing columns: {missing}", file=sys.stderr)
            sys.exit(1)

        for row in reader:
            fips = clean_fips(row["TRACTFIPS"])
            if not fips or len(fips) != 11:
                skipped += 1
                continue

            if state_filter and not fips.startswith(state_filter):
                continue

            # ── Flood: take the higher of inland and coastal percentiles
            ifld  = to_float(row["IFLD_RISKS"])
            cfld  = to_float(row["CFLD_RISKS"])
            flood = max(ifld, cfld)

            # Choose the rating string from whichever flood type dominates
            flood_rating = row["IFLD_RISKR"] if ifld >= cfld else row["CFLD_RISKR"]
            if flood_rating in ("No Rating", "", None):
                flood_rating = row["IFLD_RISKR"] if row["IFLD_RISKR"] != "No Rating" else row["CFLD_RISKR"]

            wildfire   = to_float(row["WFIR_RISKS"])
            earthquake = to_float(row["ERQK_RISKS"])

            # Composite: equal-weight average (all three on 0–100 scale, then /100)
            composite = (wildfire + flood + earthquake) / 3.0

            lookup[fips] = {
                # Normalised 0–1 scores
                "score_wildfire":   percentile_to_unit(wildfire),
                "score_flood":      percentile_to_unit(flood),
                "score_earthquake": percentile_to_unit(earthquake),
                "score_composite":  percentile_to_unit(composite),

                # Raw percentile scores (0–100)
                "pct_wildfire":   round(wildfire, 2),
                "pct_flood":      round(flood, 2),
                "pct_earthquake": round(earthquake, 2),

                # Textual ratings
                "wildfire_rating":   row["WFIR_RISKR"],
                "flood_rating":      flood_rating,
                "earthquake_rating": row["ERQK_RISKR"],
                "overall_rating":    row.get("RISK_RATNG", ""),

                # FIPS components
                "state_fips":  fips[:2],
                "county_fips": fips[2:5],
                "tract_fips":  fips,
            }

    if skipped:
        print(f"[warn] Skipped {skipped} rows with invalid TRACTFIPS")

    return lookup


def scores_only_geojson(lookup: dict) -> dict:
    """Build a GeoJSON FeatureCollection with null geometry (scores only)."""
    features = []
    for fips, props in lookup.items():
        features.append({
            "type": "Feature",
            "properties": {"TRACTFIPS": fips, **props},
            "geometry": None,
        })
    return {"type": "FeatureCollection", "features": features}


def joined_geojson(lookup: dict, tracts_path: str) -> dict:
    """Join scores onto tract geometries. Unmatched tracts are dropped."""
    with open(tracts_path, encoding="utf-8") as f:
        tracts = json.load(f)

    features = []
    matched = unmatched = 0

    for feat in tracts.get("features", []):
        p = feat.get("properties", {})

        # Try common GEOID field names used by Census TIGER GeoJSON
        geoid = (
            p.get("GEOID") or p.get("GEOID20") or p.get("TRACTCE") or
            p.get("geoid") or p.get("tract_fips") or ""
        )
        geoid = str(geoid).lstrip("'").strip().zfill(11)

        if geoid in lookup:
            feat["properties"] = {**p, "TRACTFIPS": geoid, **lookup[geoid]}
            features.append(feat)
            matched += 1
        else:
            unmatched += 1

    print(f"[info] Matched {matched} tracts, {unmatched} unmatched (no score data)")
    return {"type": "FeatureCollection", "features": features}


def main():
    parser = argparse.ArgumentParser(description="NRI CSV → GeoJSON risk scores")
    parser.add_argument("--csv",         required=True,  help="Path to NRI_Table_CensusTracts.csv")
    parser.add_argument("--tracts",      default=None,   help="Path to census tract geometries GeoJSON")
    parser.add_argument("--no-geometry", action="store_true", help="Output scores-only GeoJSON (null geometry)")
    parser.add_argument("--state",       default=None,   help="Filter to a state FIPS prefix, e.g. 06 for California")
    parser.add_argument("--out",         default="nri_risk_scores.geojson", help="Output filename")
    args = parser.parse_args()

    if not Path(args.csv).exists():
        print(f"[ERROR] CSV not found: {args.csv}", file=sys.stderr)
        sys.exit(1)

    print(f"[info] Reading {args.csv} ...")
    lookup = build_score_lookup(args.csv, args.state)
    print(f"[info] Loaded scores for {len(lookup):,} tracts")

    if args.no_geometry or not args.tracts:
        if args.tracts:
            print("[warn] --tracts ignored because --no-geometry was set")
        print("[info] Building scores-only GeoJSON (null geometry) ...")
        geojson = scores_only_geojson(lookup)
    else:
        if not Path(args.tracts).exists():
            print(f"[ERROR] Tracts file not found: {args.tracts}", file=sys.stderr)
            sys.exit(1)
        print(f"[info] Joining to geometries from {args.tracts} ...")
        geojson = joined_geojson(lookup, args.tracts)

    out_path = args.out
    with open(out_path, "w", encoding="utf-8") as f:
        features = geojson["features"]
        f.write('{"type":"FeatureCollection","features":[\n')
        for i, feat in enumerate(features):
            f.write(json.dumps(feat, separators=(",", ":")))
            if i < len(features) - 1:
                f.write(",\n")
        f.write("\n]}")

    size_mb = Path(out_path).stat().st_size / 1_048_576
    print(f"[done] Written {len(geojson['features']):,} features → {out_path} ({size_mb:.1f} MB)")

    # Print a quick sample
    sample = geojson["features"][:2]
    print("\n── Sample output (first 2 features) ──")
    for feat in sample:
        p = feat["properties"]
        print(f"  {p['tract_fips']}  wildfire={p['score_wildfire']}  flood={p['score_flood']}  "
              f"earthquake={p['score_earthquake']}  composite={p['score_composite']}  "
              f"[{p['overall_rating']}]")


if __name__ == "__main__":
    main()