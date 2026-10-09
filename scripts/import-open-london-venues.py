#!/usr/bin/env python3
"""Build reviewable, photo-attributed London listing candidates.

This is a one-off editorial import, not a live scraper. Wikidata supplies
factual names/locations and Wikimedia Commons photo references. A currently
mapped OpenStreetMap feature near the coordinates can corroborate the venue.
Only Commons files with a reusable license and recorded credit are selected.
Run with --section nightlife|food|places|kids|hotels and inspect --output JSON
before merging it into the curated data file.
"""

import argparse
import html
import json
import math
import re
import time
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

USER_AGENT = "TAPLondonCatalog/0.1 (https://github.com/mjasil/TAP-LONDON-1)"
CENTER = "Point(-0.1278 51.5074)"
RADIUS_KM = 15

TYPES = {
    "nightlife": {"Q212198": ("Pubs", 'amenity', 'pub'), "Q622425": ("Clubs", 'amenity', 'nightclub')},
    "food": {"Q11707": ("Restaurants", 'amenity', 'restaurant')},
    "places": {
        "Q33506": ("Museums & Galleries", 'tourism', 'museum'),
        "Q22698": ("Parks & Gardens", 'leisure', 'park'),
        "Q1007870": ("Museums & Galleries", 'tourism', 'gallery'),
        "Q570116": ("Top Attractions", 'tourism', 'attraction'),
    },
    "kids": {
        "Q33506": ("Museums", 'tourism', 'museum'),
        "Q22698": ("Parks", 'leisure', 'park'),
        "Q11875349": ("Parks", 'leisure', 'playground'),
        "Q43501": ("Activities", 'tourism', 'zoo'),
    },
    "hotels": {"Q27686": ("Hotels", 'tourism', 'hotel')},
}


def request_json(url, data=None, timeout=100):
    req = urllib.request.Request(url, data=data, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.load(response)


def get_candidates(section):
    types = " ".join("wd:" + qid for qid in TYPES[section])
    query = f'''SELECT DISTINCT ?item ?itemLabel ?type ?image ?coordinate ?districtLabel ?website WHERE {{
      SERVICE wikibase:around {{
        ?item wdt:P625 ?coordinate.
        bd:serviceParam wikibase:center "{CENTER}"^^geo:wktLiteral.
        bd:serviceParam wikibase:radius "{RADIUS_KM}".
      }}
      VALUES ?type {{ {types} }}
      ?item wdt:P31 ?type; wdt:P18 ?image.
      FILTER NOT EXISTS {{ ?item wdt:P576 ?closed }}
      OPTIONAL {{ ?item wdt:P131 ?district. }}
      OPTIONAL {{ ?item wdt:P856 ?website. }}
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
    }} LIMIT 3500'''
    params = urllib.parse.urlencode({"query": query, "format": "json"})
    rows = request_json("https://query.wikidata.org/sparql?" + params)["results"]["bindings"]
    candidates = {}
    for row in rows:
        qid = row["item"]["value"].rsplit("/", 1)[-1]
        name = row["itemLabel"]["value"].strip()
        if name == qid or not 3 <= len(name) <= 90:
            continue
        image_url = row["image"]["value"]
        if "Special:FilePath/" not in image_url:
            continue
        coords = re.match(r"Point\((-?[\d.]+) ([-\d.]+)\)", row["coordinate"]["value"])
        if not coords:
            continue
        if qid not in candidates:
            district = row.get("districtLabel", {}).get("value", "")
            if district.startswith("Q") and district[1:].isdigit():
                district = ""
            district = re.sub(r"^(?:London Borough of|Royal Borough of|City of) ", "", district)
            candidates[qid] = {
                "qid": qid, "name": name,
                "category": TYPES[section][row["type"]["value"].rsplit("/", 1)[-1]][0],
                "lon": float(coords[1]), "lat": float(coords[2]),
                "area": district or "London",
                "file": urllib.parse.unquote(image_url.rsplit("Special:FilePath/", 1)[-1]),
                "websiteUrl": row.get("website", {}).get("value", ""),
            }
        elif candidates[qid]["area"] == "London" and row.get("districtLabel"):
            candidates[qid]["area"] = re.sub(
                r"^(?:London Borough of|Royal Borough of|City of) ", "",
                row["districtLabel"]["value"],
            )
    return list(candidates.values())


def get_osm_features(section):
    checks = sorted({(kind, value) for _, kind, value in TYPES[section].values()})
    # A single Greater London query regularly times out on public Overpass.
    # Small, adjacent bounding boxes keep request cost modest for volunteers.
    features = {}
    lat_edges = [51.37, 51.46, 51.55, 51.64]
    lon_edges = [-0.37, -0.21, -0.05, 0.11]
    for south, north in zip(lat_edges, lat_edges[1:]):
        for west, east in zip(lon_edges, lon_edges[1:]):
            bbox = f"{south},{west},{north},{east}"
            clauses = "".join(
                f'nwr({bbox})["{kind}"="{value}"]["name"];'
                for kind, value in checks
            )
            query = f"[out:json][timeout:70];({clauses});out center tags;"
            body = urllib.parse.urlencode({"data": query}).encode()
            for attempt in range(3):
                try:
                    rows = request_json("https://overpass-api.de/api/interpreter", body, timeout=85)["elements"]
                    break
                except Exception:
                    if attempt == 2:
                        raise
                    time.sleep(2 + attempt * 4)
            for feature in rows:
                features[f"{feature['type']}/{feature['id']}"] = feature
            time.sleep(0.3)
    return list(features.values())


def get_osm_features_from_pbf(section, filename):
    try:
        import osmium
    except ImportError as exc:
        raise RuntimeError("Install pyosmium (pip install osmium) to read a PBF extract") from exc

    checks = {(kind, value) for _, kind, value in TYPES[section].values()}
    features = []

    class VenueHandler(osmium.SimpleHandler):
        def target(self, obj):
            return "name" in obj.tags and any(obj.tags.get(key) == value for key, value in checks)

        def add(self, obj, kind, lat, lon):
            tags = dict(obj.tags)
            if not (51.37 <= lat <= 51.64 and -0.37 <= lon <= 0.11):
                return
            features.append({"type": kind, "id": obj.id, "lat": lat, "lon": lon, "tags": tags})

        def node(self, obj):
            if self.target(obj) and obj.location.valid():
                self.add(obj, "node", obj.location.lat, obj.location.lon)

        def way(self, obj):
            if not self.target(obj):
                return
            coordinates = [(n.lat, n.lon) for n in obj.nodes if n.location.valid()]
            if coordinates:
                self.add(obj, "way", sum(p[0] for p in coordinates) / len(coordinates),
                         sum(p[1] for p in coordinates) / len(coordinates))

    VenueHandler().apply_file(str(filename), locations=True)
    return features


def normalize(value):
    return re.sub(r"[^a-z0-9]", "", value.lower().replace("&", "and"))


def distance_m(a, b):
    dy = (a["lat"] - b["lat"]) * 111_000
    dx = (a["lon"] - b["lon"]) * 69_000
    return math.hypot(dx, dy)


def matched_osm(candidate, features):
    target_name = normalize(candidate["name"])
    for feature in features:
        tags = feature.get("tags", {})
        if tags.get("disused:amenity") or tags.get("abandoned:amenity"):
            continue
        loc = feature.get("center", feature)
        if "lat" not in loc or "lon" not in loc or distance_m(candidate, loc) > 180:
            continue
        if tags.get("wikidata") == candidate["qid"]:
            return feature
        name = normalize(tags.get("name", ""))
        if name and name == target_name and distance_m(candidate, loc) < 90:
            return feature
    return None


def commons_metadata(files):
    result = {}
    for offset in range(0, len(files), 30):
        batch = files[offset:offset + 30]
        params = urllib.parse.urlencode({
            "action": "query", "format": "json", "prop": "imageinfo",
            "iiprop": "url|extmetadata", "iiurlwidth": "900",
            "titles": "|".join("File:" + file for file in batch),
        })
        pages = request_json("https://commons.wikimedia.org/w/api.php?" + params)["query"]["pages"]
        for page in pages.values():
            if "imageinfo" not in page:
                continue
            info = page["imageinfo"][0]
            metadata = {k: v.get("value", "") for k, v in info.get("extmetadata", {}).items()}
            license_name = html.unescape(re.sub(r"<[^>]+>", "", metadata.get("LicenseShortName", ""))).strip()
            artist = html.unescape(re.sub(r"<[^>]+>", "", metadata.get("Artist", ""))).strip()
            artist = re.sub(r"\s+", " ", artist).strip()[:130]
            if not artist or not license_name or not (
                license_name.startswith("CC BY") or license_name in {"CC0", "Public domain"}
            ):
                continue
            if len(artist) < 2 or "unknown" in artist.lower():
                continue
            result[page["title"].removeprefix("File:").replace("_", " ")] = {
                "image": (info.get("thumburl") or info["url"]).split("?", 1)[0].replace("http://", "https://"),
                "imageSourceUrl": info["descriptionurl"],
                "imageLicense": license_name,
                "imageLicenseUrl": metadata.get("LicenseUrl", "https://creativecommons.org/publicdomain/zero/1.0/"),
                "imageCredit": artist,
            }
        time.sleep(0.15)
    return result


def make_listing(section, item, photo, osm=None):
    qid = item["qid"]
    area = item["area"]
    category = item["category"]
    noun = {"Pubs": "pub", "Clubs": "club", "Restaurants": "restaurant",
            "Museums & Galleries": "museum or gallery", "Parks & Gardens": "public park",
            "Top Attractions": "visitor attraction", "Museums": "museum",
            "Parks": "park", "Activities": "family attraction", "Hotels": "hotel"}[category]
    description = f"{item['name']} is a {noun} in {area}. Check current visiting details before you go."
    location = urllib.parse.quote(f"{item['lat']},{item['lon']}")
    data = {
        "id": f"wd-{qid.lower()}", "name": item["name"], "category": category,
        "area": area, "description": description,
        "mapsUrl": f"https://www.google.com/maps/search/?api=1&query={location}",
        **photo,
        "sourceName": "Wikidata and OpenStreetMap" if osm else "Wikidata",
        "sourceUrl": f"https://www.wikidata.org/wiki/{qid}",
        "websiteUrl": item["websiteUrl"],
        "sourceCheckedAt": date.today().isoformat(),
        "openingStatusVerified": False,
    }
    if osm:
        data["osmUrl"] = f"https://www.openstreetmap.org/{osm['type']}/{osm['id']}"
    if section == "nightlife":
        data.update({"openingHours": "Check with venue", "entryFee": "Check with venue",
                     "listingStatus": "Listed", "partnerConfirmed": False, "contactStatus": "Not contacted"})
    elif section == "food":
        data.update({"cuisine": "", "priceRange": "", "halal": False,
                     "verifiedHalal": False, "tags": []})
    elif section == "places":
        data.update({"openingHours": "Check official website", "entryFee": "Check official website",
                     "priceType": "Check venue"})
    elif section == "kids":
        data.update({"openingHours": "Check official website", "entryFee": "Check official website",
                     "priceType": "Check venue", "ageRange": "All ages"})
    elif section == "hotels":
        data.update({"priceRange": "Check hotel", "rating": None, "amenities": []})
    return data


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--section", required=True, choices=TYPES)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--limit", type=int, default=600)
    parser.add_argument("--skip-osm", action="store_true", help="Skip an unavailable map endpoint; opening status remains unverified")
    parser.add_argument("--osm-extract", type=Path, help="Local London .osm.pbf (ODbL) for offline map checks")
    parser.add_argument("--cache-dir", type=Path, help="Store source snapshots locally to avoid repeated public API calls")
    args = parser.parse_args()
    cache = args.cache_dir / f"{args.section}-wikidata.json" if args.cache_dir else None
    if cache and cache.exists():
        candidates = json.loads(cache.read_text())
    else:
        candidates = get_candidates(args.section)
        if cache:
            cache.parent.mkdir(parents=True, exist_ok=True)
            cache.write_text(json.dumps(candidates))
    print(f"{args.section}: {len(candidates)} image-backed Wikidata candidates", flush=True)
    if args.osm_extract:
        map_cache = args.cache_dir / f"{args.section}-osm.json" if args.cache_dir else None
        if map_cache and map_cache.exists():
            features = json.loads(map_cache.read_text())
        else:
            features = get_osm_features_from_pbf(args.section, args.osm_extract)
            if map_cache:
                map_cache.write_text(json.dumps(features))
        print(f"{len(features)} mapped features in extract", flush=True)
        matches = [(item, osm) for item in candidates if (osm := matched_osm(item, features))]
        print(f"{len(matches)} corroborated names/locations", flush=True)
    elif args.skip_osm:
        matches = [(item, None) for item in candidates]
    else:
        features = get_osm_features(args.section)
        print(f"{len(features)} currently mapped features", flush=True)
        matches = [(item, osm) for item in candidates if (osm := matched_osm(item, features))]
        print(f"{len(matches)} corroborated names/locations", flush=True)
    # Keep nearest central venues first; IDs and photos remain stable.
    matches.sort(key=lambda pair: distance_m(pair[0], {"lat": 51.5074, "lon": -0.1278}))
    photos = commons_metadata(list(dict.fromkeys(item["file"] for item, _ in matches[:args.limit + 100])))
    listings = []
    for item, osm in matches:
        photo = photos.get(item["file"].replace("_", " "))
        if photo:
            listings.append(make_listing(args.section, item, photo, osm))
        if len(listings) >= args.limit:
            break
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps({"items": listings}, ensure_ascii=False, indent=2) + "\n")
    print(f"{len(listings)} licensed-photo candidates written to {args.output}", flush=True)


if __name__ == "__main__":
    main()
