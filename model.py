import geopandas as gpd

# Read directly from the geodatabase
# The EPA Smart Location Database has one main layer
gdf = gpd.read_file("SmartLocationDatabase.gdb")

print(gdf.crs)        # check current projection
print(gdf.shape)      # how many rows and columns
print(gdf.head(2))    # sanity check


# Filter to LA metro first
la = gdf[gdf["CBSA_Name"] == "Los Angeles-Long Beach-Anaheim, CA"].copy()
print(f"LA has {len(la)} block groups")

# Reproject to WGS84 for web mapping
la = la.to_crs(epsg=4326)

# Compute your scores
def normalize(series, clip=True):
    if clip:
        low = series.quantile(0.05)
        high = series.quantile(0.95)
        series = series.clip(low, high)
    else:
        low = series.min()
        high = series.max()
    return (series - low) / (high - low)

la["score_walkability"] = normalize(la["NatWalkInd"])
la["score_transit"]     = normalize(la["D4B025"])
la["score_employment"]  = normalize(la["D5AE"])
la["score_vmt"]         = 1 - normalize(la["VMT_per_worker"])

# Keep only what you need
score_cols = [c for c in la.columns if c.startswith("score_")]
keep = ["GEOID20", "geometry"] + score_cols
la_slim = la[keep].copy()

# Default composite
la_slim["composite"] = la_slim[score_cols].mean(axis=1)
la_slim = la_slim.fillna(0)

# Export to GeoJSON for Mapbox
la_slim.to_file("scores_la.geojson", driver="GeoJSON")
print(f"Done — exported {len(la_slim)} block groups")