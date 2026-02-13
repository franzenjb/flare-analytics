"""
Download fire station data from HIFLD (Homeland Infrastructure Foundation-Level Data).
Source: ArcGIS Feature Service with ~53,087 stations.
Outputs compact JSON for the FLARE dashboard map layer + station counts per county FIPS.
"""

import json
import os
import urllib.request
import urllib.parse

SERVICE_URL = "https://services1.arcgis.com/0MSEUqKaxRlEPj5g/arcgis/rest/services/Fire_Stations2/FeatureServer/0/query"
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "data")
SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))


def query_features(offset=0, batch_size=2000):
    """Query HIFLD fire stations feature service with pagination."""
    params = urllib.parse.urlencode({
        "where": "1=1",
        "outFields": "NAME,ADDRESS,CITY,STATE,COUNTY,FIPS,FDID,X,Y",
        "returnGeometry": "false",
        "resultOffset": offset,
        "resultRecordCount": batch_size,
        "f": "json",
    })
    url = f"{SERVICE_URL}?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": "FLARE-Analytics/1.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("Downloading fire stations from HIFLD...")
    all_features = []
    offset = 0
    batch_size = 2000

    while True:
        print(f"  Fetching batch at offset {offset}...")
        data = query_features(offset, batch_size)
        features = data.get("features", [])
        if not features:
            break
        all_features.extend(features)
        offset += len(features)
        # Check if more records exist
        if not data.get("exceededTransferLimit", False) and len(features) < batch_size:
            break

    print(f"  Downloaded {len(all_features):,} fire stations")

    # Build compact format (flat arrays like fires-points.json)
    names = []
    lats = []
    lons = []
    fips_list = []
    fdids = []
    addresses = []
    cities = []
    states = []

    # Count stations per county FIPS
    fips_counts = {}

    skipped = 0
    for f in all_features:
        attrs = f.get("attributes", {})
        lat = attrs.get("Y")
        lon = attrs.get("X")
        name = attrs.get("NAME", "")
        fips = str(attrs.get("FIPS", "")).strip()
        fdid = str(attrs.get("FDID", "")).strip()
        addr = attrs.get("ADDRESS", "") or ""
        city = attrs.get("CITY", "") or ""
        state = attrs.get("STATE", "") or ""

        # Skip entries without coordinates
        if lat is None or lon is None or lat == 0 or lon == 0:
            skipped += 1
            continue

        # Pad FIPS to 5 digits if numeric
        if fips and fips.isdigit():
            fips = fips.zfill(5)

        names.append(name or "Unknown")
        lats.append(round(lat, 4))
        lons.append(round(lon, 4))
        fips_list.append(fips)
        fdids.append(fdid)
        addresses.append(addr)
        cities.append(city)
        states.append(state)

        # Count per FIPS
        if fips and len(fips) == 5:
            fips_counts[fips] = fips_counts.get(fips, 0) + 1

    print(f"  Valid stations: {len(names):,} | Skipped (no coords): {skipped}")
    print(f"  Counties with stations: {len(fips_counts):,}")

    # Write fire-stations.json (compact flat arrays)
    stations_data = {
        "name": names,
        "lat": lats,
        "lon": lons,
        "fips": fips_list,
        "fdid": fdids,
        "addr": addresses,
        "city": cities,
        "state": states,
        "count": len(names),
    }
    stations_path = os.path.join(OUTPUT_DIR, "fire-stations.json")
    with open(stations_path, "w") as f:
        json.dump(stations_data, f, separators=(",", ":"))
    size = os.path.getsize(stations_path)
    print(f"  Wrote fire-stations.json: {size:,} bytes ({len(names):,} stations)")

    # Write station counts per FIPS for by-county.json enrichment
    counts_path = os.path.join(SCRIPTS_DIR, "fire_station_counts.json")
    with open(counts_path, "w") as f:
        json.dump(fips_counts, f, separators=(",", ":"))
    print(f"  Wrote fire_station_counts.json: {len(fips_counts):,} counties")

    # Update by-county.json with stationCount field
    county_path = os.path.join(OUTPUT_DIR, "by-county.json")
    if os.path.exists(county_path):
        print("  Enriching by-county.json with station counts...")
        with open(county_path, "r") as f:
            counties = json.load(f)
        enriched = 0
        for county in counties:
            fips = county.get("fips", "")
            count = fips_counts.get(fips, 0)
            county["stationCount"] = count
            if count > 0:
                enriched += 1
        with open(county_path, "w") as f:
            json.dump(counties, f, separators=(",", ":"))
        print(f"  Enriched {enriched:,} of {len(counties):,} counties with station counts")
        total_matched = sum(fips_counts.get(c.get("fips", ""), 0) for c in counties)
        print(f"  Total stations matched to fire counties: {total_matched:,}")

    print("\nDone!")


if __name__ == "__main__":
    main()
