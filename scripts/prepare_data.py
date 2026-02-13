"""
FLARE Analytics Data Pipeline
Processes Match Map.xlsx (103,400 fire events) into optimized JSON files for the dashboard.
Enriches each event with Red Cross organizational hierarchy (Chapter/Region/Division) via:
  - ZIP code → county FIPS (from comprehensive ZIP lookup CSV)
  - County FIPS → Chapter/Region/Division (from ARC Master Geography FY2026)
  - County FIPS → State (from FIPS prefix, not address parsing)
"""

import openpyxl
import json
import os
import csv
from collections import defaultdict
from datetime import datetime

INPUT_FILE = os.path.expanduser("~/Desktop/FlareData/Match Map.xlsx")
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "data")
SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
ZIP_LOOKUP_FILE = os.path.join(SCRIPTS_DIR, "zip_to_redcross_comprehensive.csv")
DEMOGRAPHICS_FILE = os.path.join(SCRIPTS_DIR, "county_demographics.json")
ARC_MAPPING_FILE = os.path.join(SCRIPTS_DIR, "arc_county_chapter_mapping.json")

# Master Label mapping to short keys
LABEL_MAP = {
    "Fire with RC Care": "care",
    "Fire with RC Notification": "notification",
    "Fire without RC Notification": "gap",
}


def parse_date(val):
    """Parse date from Excel datetime or string."""
    if val is None:
        return None
    if isinstance(val, datetime):
        return val
    try:
        return datetime.strptime(str(val).strip(), "%Y-%m-%d %H:%M:%S")
    except ValueError:
        try:
            return datetime.strptime(str(val).strip(), "%m/%d/%Y")
        except ValueError:
            return None


def parse_float(val):
    """Safely parse a float value."""
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


import re

# US zip code prefix (first 3 digits) to state mapping
ZIP_PREFIX_TO_STATE = {}
_zip_ranges = [
    ("005","009","PR"),("010","027","MA"),("028","029","RI"),("030","038","NH"),
    ("039","049","ME"),("050","059","VT"),("060","069","CT"),("070","089","NJ"),
    ("090","099","AE"),("100","149","NY"),("150","196","PA"),("197","199","DE"),
    ("200","205","DC"),("206","219","MD"),("220","246","VA"),("247","268","WV"),
    ("270","289","NC"),("290","299","SC"),("300","319","GA"),("320","349","FL"),
    ("350","369","AL"),("370","385","TN"),("386","397","MS"),("398","399","GA"),
    ("400","427","KY"),("430","459","OH"),("460","479","IN"),("480","499","MI"),
    ("500","528","IA"),("530","549","WI"),("550","567","MN"),("570","577","SD"),
    ("580","588","ND"),("590","599","MT"),("600","629","IL"),("630","658","MO"),
    ("660","679","KS"),("680","693","NE"),("700","714","LA"),("716","729","AR"),
    ("730","749","OK"),("750","799","TX"),("800","816","CO"),("820","831","WY"),
    ("832","838","ID"),("840","847","UT"),("850","865","AZ"),("870","884","NM"),
    ("889","898","NV"),("900","966","CA"),("967","968","HI"),("970","979","OR"),
    ("980","994","WA"),("995","999","AK"),("006","009","PR"),("008","008","VI"),
    ("969","969","GU"),
]
for start, end, state in _zip_ranges:
    for prefix in range(int(start), int(end) + 1):
        ZIP_PREFIX_TO_STATE[f"{prefix:03d}"] = state


def extract_state(address):
    """Extract state from address using zip code prefix mapping."""
    if not address:
        return None
    addr = str(address).strip()

    # Try to find a 5-digit zip code in the address
    zips = re.findall(r'\b(\d{5})\b', addr)
    if zips:
        # Use the last zip code found (most likely the address zip)
        prefix = zips[-1][:3]
        state = ZIP_PREFIX_TO_STATE.get(prefix)
        if state:
            return state

    # Fallback: try to find state abbreviation or name
    us_states = {
        "ALABAMA": "AL", "ALASKA": "AK", "ARIZONA": "AZ", "ARKANSAS": "AR",
        "CALIFORNIA": "CA", "COLORADO": "CO", "CONNECTICUT": "CT", "DELAWARE": "DE",
        "FLORIDA": "FL", "GEORGIA": "GA", "HAWAII": "HI", "IDAHO": "ID",
        "ILLINOIS": "IL", "INDIANA": "IN", "IOWA": "IA", "KANSAS": "KS",
        "KENTUCKY": "KY", "LOUISIANA": "LA", "MAINE": "ME", "MARYLAND": "MD",
        "MASSACHUSETTS": "MA", "MICHIGAN": "MI", "MINNESOTA": "MN", "MISSISSIPPI": "MS",
        "MISSOURI": "MO", "MONTANA": "MT", "NEBRASKA": "NE", "NEVADA": "NV",
        "NEW HAMPSHIRE": "NH", "NEW JERSEY": "NJ", "NEW MEXICO": "NM", "NEW YORK": "NY",
        "NORTH CAROLINA": "NC", "NORTH DAKOTA": "ND", "OHIO": "OH", "OKLAHOMA": "OK",
        "OREGON": "OR", "PENNSYLVANIA": "PA", "RHODE ISLAND": "RI", "SOUTH CAROLINA": "SC",
        "SOUTH DAKOTA": "SD", "TENNESSEE": "TN", "TEXAS": "TX", "UTAH": "UT",
        "VERMONT": "VT", "VIRGINIA": "VA", "WASHINGTON": "WA", "WEST VIRGINIA": "WV",
        "WISCONSIN": "WI", "WYOMING": "WY", "DISTRICT OF COLUMBIA": "DC",
        "PUERTO RICO": "PR", "GUAM": "GU", "VIRGIN ISLANDS": "VI",
    }
    addr_upper = addr.upper()
    for name, abbr in us_states.items():
        if name in addr_upper:
            return abbr

    return None


def load_zip_lookup():
    """Load ZIP → county FIPS lookup. Returns dict keyed by 5-digit ZIP string."""
    lookup = {}
    with open(ZIP_LOOKUP_FILE, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            zip_code = row["ZIP_CODE"].strip().zfill(5)
            lookup[zip_code] = {
                "county_fips": row.get("COUNTY_FIPS", "").strip(),
                "county": row.get("County", "").strip(),
            }
    return lookup


def normalize_arc_name(name):
    """Normalize ARC entity names: strip 'The ' prefix, 'American Red Cross' → 'ARC'."""
    if name.startswith("The "):
        name = name[4:]
    if name.startswith("American Red Cross"):
        name = "ARC" + name[len("American Red Cross"):]
    return name


def load_arc_mapping():
    """Load ARC Master Geography FIPS → Chapter/Region/Division mapping (226 chapters, 3,162 counties)."""
    with open(ARC_MAPPING_FILE, "r") as f:
        records = json.load(f)
    mapping = {}
    for r in records:
        mapping[r["fips"]] = {
            "county": r["county"],
            "state": r["state"],
            "chapter": normalize_arc_name(r["chapter"]),
            "region": r["region"],
            "division": r["division"],
        }
    return mapping


# FIPS state prefix → state abbreviation
FIPS_TO_STATE = {
    "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO",
    "09": "CT", "10": "DE", "11": "DC", "12": "FL", "13": "GA", "15": "HI",
    "16": "ID", "17": "IL", "18": "IN", "19": "IA", "20": "KS", "21": "KY",
    "22": "LA", "23": "ME", "24": "MD", "25": "MA", "26": "MI", "27": "MN",
    "28": "MS", "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
    "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND", "39": "OH",
    "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD",
    "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA",
    "54": "WV", "55": "WI", "56": "WY", "72": "PR", "78": "VI", "66": "GU",
    "69": "MP", "60": "AS",
}


def state_from_fips(fips):
    """Derive state abbreviation from FIPS code prefix."""
    if fips and len(fips) >= 2:
        return FIPS_TO_STATE.get(fips[:2])
    return None


def load_demographics():
    """Load county demographics keyed by FIPS code."""
    with open(DEMOGRAPHICS_FILE, "r") as f:
        return json.load(f)


def extract_zip(row, col_map):
    """Extract first 5-digit ZIP from address columns B-E."""
    for col_key in ("address", "nfirs_addr", "rc_respond_addr", "rc_care_addr"):
        val = row[col_map[col_key]]
        if val:
            zips = re.findall(r'\b(\d{5})\b', str(val))
            if zips:
                return zips[-1]
    return None


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Load lookups
    print("Loading ZIP → county FIPS lookup...")
    zip_lookup = load_zip_lookup()
    print(f"  Loaded {len(zip_lookup):,} ZIP codes")

    print("Loading ARC Master Geography (FIPS → Chapter/Region/Division)...")
    arc_mapping = load_arc_mapping()
    print(f"  Loaded {len(arc_mapping):,} counties → {len(set(m['chapter'] for m in arc_mapping.values()))} chapters")

    print("Loading county demographics...")
    demographics = load_demographics()
    print(f"  Loaded {len(demographics):,} counties")

    print(f"Loading {INPUT_FILE}...")
    wb = openpyxl.load_workbook(INPUT_FILE, read_only=True, data_only=True)
    ws = wb.active

    rows = ws.iter_rows(values_only=True)

    # Skip metadata rows (row 1 = filter text, row 2 = blank)
    next(rows)  # row 1 metadata
    next(rows)  # row 2 blank

    # Row 3 = actual headers
    header = next(rows)
    print(f"Columns: {[str(h) for h in header]}")

    # Column indices
    COL = {
        "date": 0,
        "address": 1,
        "nfirs_addr": 2,
        "rc_respond_addr": 3,
        "rc_care_addr": 4,
        "department": 5,
        "agency_reported": 6,
        "calls_received": 7,
        "svi_risk": 8,
        "master_label": 9,
        "lat": 10,
        "lon": 11,
    }

    # Accumulators
    points_lat = []
    points_lon = []
    points_cat = []  # 0=care, 1=notification, 2=gap
    points_svi = []
    points_month = []
    points_chapter = []  # index into chapter_list for map hover
    points_region = []   # index into region_list for map hover

    # Lookup lists for compact point encoding (index → name)
    chapter_list = []
    chapter_idx_map = {}
    region_list = []
    region_idx_map = {}

    totals = {"care": 0, "notification": 0, "gap": 0, "total": 0}
    svi_sum = 0.0
    svi_count = 0
    zip_match_count = 0

    monthly = defaultdict(lambda: {"care": 0, "notification": 0, "gap": 0, "total": 0})
    daily = defaultdict(lambda: {"care": 0, "notification": 0, "gap": 0, "total": 0})
    by_state = defaultdict(lambda: {
        "care": 0, "notification": 0, "gap": 0, "total": 0,
        "svi_sum": 0.0, "svi_count": 0,
        "monthly": defaultdict(lambda: {"care": 0, "notification": 0, "gap": 0, "total": 0}),
    })
    by_dept = defaultdict(lambda: {
        "care": 0, "notification": 0, "gap": 0, "total": 0,
        "svi_sum": 0.0, "svi_count": 0,
    })

    # New org hierarchy accumulators
    def _org_acc():
        return {
            "care": 0, "notification": 0, "gap": 0, "total": 0,
            "svi_sum": 0.0, "svi_count": 0,
            "monthly": defaultdict(lambda: {"care": 0, "notification": 0, "gap": 0, "total": 0}),
        }

    by_county = defaultdict(_org_acc)     # keyed by county_fips
    by_chapter = defaultdict(_org_acc)    # keyed by chapter name
    by_region = defaultdict(_org_acc)     # keyed by region name
    by_division = defaultdict(_org_acc)   # keyed by division name

    # Track county metadata (fips → {name, state, chapter, region, division})
    county_meta = {}

    # SVI histogram bins (0.0-0.1, 0.1-0.2, ..., 0.9-1.0)
    svi_bins_total = [0] * 10
    svi_bins_gap = [0] * 10

    # Funnel stages
    funnel = {"total": 0, "nfirs_match": 0, "rc_notified": 0, "rc_care": 0}

    skipped = 0
    processed = 0

    print("Processing rows...")
    for row in rows:
        label_raw = row[COL["master_label"]]
        if not label_raw:
            skipped += 1
            continue

        label = LABEL_MAP.get(str(label_raw).strip())
        if not label:
            skipped += 1
            continue

        lat = parse_float(row[COL["lat"]])
        lon = parse_float(row[COL["lon"]])
        if lat is None or lon is None:
            skipped += 1
            continue

        # Skip extreme outliers (territories far from CONUS for main rendering)
        date = parse_date(row[COL["date"]])
        svi = parse_float(row[COL["svi_risk"]])
        dept = str(row[COL["department"]]).strip() if row[COL["department"]] else "Unknown"
        # ZIP extraction → county FIPS → ARC hierarchy
        zip_code = extract_zip(row, COL)
        zip_info = zip_lookup.get(zip_code) if zip_code else None
        chapter_name = ""
        region_name = ""
        division_name = ""
        county_fips = ""
        county_name = ""
        state = ""

        if zip_info:
            county_fips = zip_info["county_fips"]
            county_name = zip_info["county"]

        # Look up hierarchy from ARC Master Geography (authoritative source, 226 chapters)
        arc_info = arc_mapping.get(county_fips) if county_fips else None
        if arc_info:
            zip_match_count += 1
            chapter_name = arc_info["chapter"]
            region_name = arc_info["region"]
            division_name = arc_info["division"]
            county_name = arc_info["county"] or county_name
            state = arc_info["state"]
        elif zip_info:
            # Fallback: no ARC mapping for this FIPS, derive state from FIPS
            zip_match_count += 1
            state = state_from_fips(county_fips) or ""

        # Derive state from FIPS prefix (not address parsing) — always overrides
        if county_fips:
            fips_state = state_from_fips(county_fips)
            if fips_state:
                state = fips_state

        # Track county metadata
        if county_fips and county_fips not in county_meta:
            county_meta[county_fips] = {
                "name": county_name,
                "state": state,
                "chapter": chapter_name,
                "region": region_name,
                "division": division_name,
            }

        # Accumulate by org hierarchy
        if county_fips:
            for key, acc in [
                (county_fips, by_county),
                (chapter_name, by_chapter),
                (region_name, by_region),
                (division_name, by_division),
            ]:
                if key:
                    acc[key][label] += 1
                    acc[key]["total"] += 1
                    if svi is not None:
                        acc[key]["svi_sum"] += svi
                        acc[key]["svi_count"] += 1
                    if date:
                        m = date.strftime("%Y-%m")
                        acc[key]["monthly"][m][label] += 1
                        acc[key]["monthly"][m]["total"] += 1

        # Build chapter/region index for compact map point encoding
        ch_idx = -1
        rg_idx = -1
        if chapter_name:
            if chapter_name not in chapter_idx_map:
                chapter_idx_map[chapter_name] = len(chapter_list)
                chapter_list.append(chapter_name)
            ch_idx = chapter_idx_map[chapter_name]
        if region_name:
            if region_name not in region_idx_map:
                region_idx_map[region_name] = len(region_list)
                region_list.append(region_name)
            rg_idx = region_idx_map[region_name]

        # Category index for compact storage
        cat_idx = {"care": 0, "notification": 1, "gap": 2}[label]

        # Points for deck.gl (flat arrays for minimal JSON size)
        points_lat.append(round(lat, 4))
        points_lon.append(round(lon, 4))
        points_cat.append(cat_idx)
        points_svi.append(round(svi, 3) if svi is not None else 0)
        points_month.append(date.month if date else 0)
        points_chapter.append(ch_idx)
        points_region.append(rg_idx)

        # Totals
        totals[label] += 1
        totals["total"] += 1

        if svi is not None:
            svi_sum += svi
            svi_count += 1

            # SVI histogram
            bin_idx = min(int(svi * 10), 9)
            svi_bins_total[bin_idx] += 1
            if label == "gap":
                svi_bins_gap[bin_idx] += 1

        # Monthly
        if date:
            month_key = date.strftime("%Y-%m")
            monthly[month_key][label] += 1
            monthly[month_key]["total"] += 1

            # Daily
            day_key = date.strftime("%Y-%m-%d")
            daily[day_key][label] += 1
            daily[day_key]["total"] += 1

        # By state
        if state:
            by_state[state][label] += 1
            by_state[state]["total"] += 1
            if svi is not None:
                by_state[state]["svi_sum"] += svi
                by_state[state]["svi_count"] += 1
            if date:
                m = date.strftime("%Y-%m")
                by_state[state]["monthly"][m][label] += 1
                by_state[state]["monthly"][m]["total"] += 1

        # By department
        by_dept[dept][label] += 1
        by_dept[dept]["total"] += 1
        if svi is not None:
            by_dept[dept]["svi_sum"] += svi
            by_dept[dept]["svi_count"] += 1

        # Funnel
        funnel["total"] += 1
        if row[COL["nfirs_addr"]]:
            funnel["nfirs_match"] += 1
        if label in ("care", "notification"):
            funnel["rc_notified"] += 1
        if label == "care":
            funnel["rc_care"] += 1

        processed += 1
        if processed % 20000 == 0:
            print(f"  Processed {processed:,} rows...")

    wb.close()
    print(f"\nProcessed: {processed:,} | Skipped: {skipped}")
    print(f"Totals: {totals}")
    print(f"ZIP matches: {zip_match_count:,} ({zip_match_count/processed*100:.1f}%)")
    print(f"Counties: {len(by_county)} | Chapters: {len(by_chapter)} | Regions: {len(by_region)} | Divisions: {len(by_division)}")

    # === Write JSON files ===

    # 1. fires-points.json (flat arrays for deck.gl, now with chapter/region indices)
    points_data = {
        "lat": points_lat,
        "lon": points_lon,
        "cat": points_cat,
        "svi": points_svi,
        "month": points_month,
        "ch": points_chapter,
        "rg": points_region,
        "chapters": chapter_list,
        "regions": region_list,
        "count": len(points_lat),
    }
    write_json("fires-points.json", points_data)

    # 2. summary.json
    avg_svi = round(svi_sum / svi_count, 3) if svi_count > 0 else 0
    summary = {
        "totalFires": totals["total"],
        "rcCare": totals["care"],
        "rcNotification": totals["notification"],
        "noNotification": totals["gap"],
        "careRate": round(totals["care"] / totals["total"] * 100, 1) if totals["total"] > 0 else 0,
        "gapRate": round(totals["gap"] / totals["total"] * 100, 1) if totals["total"] > 0 else 0,
        "avgSviRisk": avg_svi,
        "uniqueDepartments": len(by_dept),
        "statesCovered": len(by_state),
    }
    write_json("summary.json", summary)

    # 3. funnel.json
    funnel_data = {
        "stages": [
            {"label": "Total Fire Events", "value": funnel["total"], "color": "#737373"},
            {"label": "NFIRS Match", "value": funnel["nfirs_match"], "color": "#4a4a4a"},
            {"label": "RC Notified", "value": funnel["rc_notified"], "color": "#2d5a27"},
            {"label": "RC Care Provided", "value": funnel["rc_care"], "color": "#ED1B2E"},
        ]
    }
    write_json("funnel.json", funnel_data)

    # 4. by-state.json
    states_out = []
    for state_code, data in sorted(by_state.items(), key=lambda x: -x[1]["total"]):
        avg = round(data["svi_sum"] / data["svi_count"], 3) if data["svi_count"] > 0 else 0
        gap_rate = round(data["gap"] / data["total"] * 100, 1) if data["total"] > 0 else 0
        care_rate = round(data["care"] / data["total"] * 100, 1) if data["total"] > 0 else 0
        monthly_sorted = []
        for m in sorted(data["monthly"].keys()):
            md = data["monthly"][m]
            monthly_sorted.append({
                "month": m,
                "care": md["care"],
                "notification": md["notification"],
                "gap": md["gap"],
                "total": md["total"],
            })
        states_out.append({
            "state": state_code,
            "total": data["total"],
            "care": data["care"],
            "notification": data["notification"],
            "gap": data["gap"],
            "careRate": care_rate,
            "gapRate": gap_rate,
            "avgSvi": avg,
            "monthly": monthly_sorted,
        })
    write_json("by-state.json", states_out)

    # 5. by-month.json
    months_out = []
    for m in sorted(monthly.keys()):
        md = monthly[m]
        months_out.append({
            "month": m,
            "care": md["care"],
            "notification": md["notification"],
            "gap": md["gap"],
            "total": md["total"],
        })
    write_json("by-month.json", months_out)

    # 6. by-day.json
    days_out = []
    for d in sorted(daily.keys()):
        dd = daily[d]
        days_out.append({
            "date": d,
            "care": dd["care"],
            "notification": dd["notification"],
            "gap": dd["gap"],
            "total": dd["total"],
        })
    write_json("by-day.json", days_out)

    # 7. by-department.json
    depts_out = []
    for dept_name, data in sorted(by_dept.items(), key=lambda x: -x[1]["total"]):
        avg = round(data["svi_sum"] / data["svi_count"], 3) if data["svi_count"] > 0 else 0
        gap_rate = round(data["gap"] / data["total"] * 100, 1) if data["total"] > 0 else 0
        care_rate = round(data["care"] / data["total"] * 100, 1) if data["total"] > 0 else 0
        gap_score = round(data["gap"] * avg, 1)
        depts_out.append({
            "name": dept_name,
            "total": data["total"],
            "care": data["care"],
            "notification": data["notification"],
            "gap": data["gap"],
            "careRate": care_rate,
            "gapRate": gap_rate,
            "avgSvi": avg,
            "gapScore": gap_score,
        })
    write_json("by-department.json", depts_out)

    # 8. gap-analysis.json (by state, sorted by opportunity score)
    gap_out = []
    for state_code, data in by_state.items():
        if data["gap"] == 0:
            continue
        avg = round(data["svi_sum"] / data["svi_count"], 3) if data["svi_count"] > 0 else 0
        opp_score = round(data["gap"] * avg, 1)
        gap_out.append({
            "state": state_code,
            "gapCount": data["gap"],
            "totalFires": data["total"],
            "avgSvi": avg,
            "opportunityScore": opp_score,
            "gapRate": round(data["gap"] / data["total"] * 100, 1) if data["total"] > 0 else 0,
            "careRate": round(data["care"] / data["total"] * 100, 1) if data["total"] > 0 else 0,
        })
    gap_out.sort(key=lambda x: -x["opportunityScore"])
    write_json("gap-analysis.json", gap_out)

    # 9. risk-distribution.json
    risk_dist = {
        "bins": [f"{i/10:.1f}-{(i+1)/10:.1f}" for i in range(10)],
        "total": svi_bins_total,
        "gap": svi_bins_gap,
    }
    write_json("risk-distribution.json", risk_dist)

    # === New Phase 2: Org Hierarchy JSON files ===

    def build_org_output(acc, meta_fn=None):
        """Build sorted output for an org-level accumulator."""
        out = []
        for key, data in sorted(acc.items(), key=lambda x: -x[1]["total"]):
            if not key:
                continue
            avg = round(data["svi_sum"] / data["svi_count"], 3) if data["svi_count"] > 0 else 0
            gap_rate = round(data["gap"] / data["total"] * 100, 1) if data["total"] > 0 else 0
            care_rate = round(data["care"] / data["total"] * 100, 1) if data["total"] > 0 else 0
            monthly_sorted = []
            for m in sorted(data["monthly"].keys()):
                md = data["monthly"][m]
                monthly_sorted.append({
                    "month": m, "care": md["care"],
                    "notification": md["notification"],
                    "gap": md["gap"], "total": md["total"],
                })
            entry = {
                "name": key,
                "total": data["total"],
                "care": data["care"],
                "notification": data["notification"],
                "gap": data["gap"],
                "careRate": care_rate,
                "gapRate": gap_rate,
                "avgSvi": avg,
                "monthly": monthly_sorted,
            }
            # Add demographics if available
            if meta_fn:
                meta = meta_fn(key)
                if meta:
                    entry.update(meta)
            out.append(entry)
        return out

    # 10. by-county.json — enriched with demographics
    def county_meta_fn(fips):
        meta = county_meta.get(fips, {})
        demo = demographics.get(fips, {})
        total = by_county[fips]["total"]
        pop = demo.get("p", 0)
        return {
            "fips": fips,
            "county": meta.get("name", ""),
            "state": meta.get("state", ""),
            "chapter": meta.get("chapter", ""),
            "region": meta.get("region", ""),
            "division": meta.get("division", ""),
            "population": pop,
            "medianIncome": demo.get("i", 0),
            "households": demo.get("hh", 0),
            "poverty": demo.get("pov", 0),
            "medianAge": demo.get("age", 0),
            "diversityIndex": demo.get("div", 0),
            "homeValue": demo.get("hv", 0),
            "firesPer10k": round(total / pop * 10000, 1) if pop > 0 else 0,
        }
    county_out = build_org_output(by_county, county_meta_fn)
    write_json("by-county.json", county_out)

    # 11. by-chapter.json
    def chapter_meta_fn(chapter_name):
        # Aggregate demographics across counties in this chapter
        counties = [f for f, m in county_meta.items() if m.get("chapter") == chapter_name]
        pop = sum(demographics.get(f, {}).get("p", 0) for f in counties)
        total = by_chapter[chapter_name]["total"]
        return {
            "countyCount": len(counties),
            "population": pop,
            "firesPer10k": round(total / pop * 10000, 1) if pop > 0 else 0,
        }
    chapter_out = build_org_output(by_chapter, chapter_meta_fn)
    write_json("by-chapter.json", chapter_out)

    # 12. by-region.json
    def region_meta_fn(region_name):
        counties = [f for f, m in county_meta.items() if m.get("region") == region_name]
        pop = sum(demographics.get(f, {}).get("p", 0) for f in counties)
        total = by_region[region_name]["total"]
        return {
            "countyCount": len(counties),
            "population": pop,
            "firesPer10k": round(total / pop * 10000, 1) if pop > 0 else 0,
        }
    region_out = build_org_output(by_region, region_meta_fn)
    write_json("by-region.json", region_out)

    # 13. by-division.json
    def division_meta_fn(div_name):
        counties = [f for f, m in county_meta.items() if m.get("division") == div_name]
        pop = sum(demographics.get(f, {}).get("p", 0) for f in counties)
        total = by_division[div_name]["total"]
        return {
            "countyCount": len(counties),
            "population": pop,
            "firesPer10k": round(total / pop * 10000, 1) if pop > 0 else 0,
        }
    division_out = build_org_output(by_division, division_meta_fn)
    write_json("by-division.json", division_out)

    print(f"\nAll JSON files written to {OUTPUT_DIR}/")
    for f in os.listdir(OUTPUT_DIR):
        if f.endswith(".json"):
            size = os.path.getsize(os.path.join(OUTPUT_DIR, f))
            print(f"  {f}: {size:,} bytes")


def write_json(filename, data):
    """Write JSON file to output directory."""
    path = os.path.join(OUTPUT_DIR, filename)
    with open(path, "w") as f:
        json.dump(data, f, separators=(",", ":"))
    print(f"  Wrote {filename}")


if __name__ == "__main__":
    main()
