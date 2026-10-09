#!/usr/bin/env python3
"""Merge reviewed, photo-credited candidates into the curated TAP data files.

The candidate files are produced by import-open-london-venues.py. Keep this
review list conservative: an OSM match does not prove a restaurant is open.
"""

import argparse
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SECTIONS = ("places", "kids", "food", "nightlife")

# Museums need a clear family activity. Other museums stay in Places.
FAMILY_MUSEUMS = {
    "Foundling Museum", "The Postal Museum", "Science Museum", "Museum of the Home",
    "Young V&A", "Arsenal Football Club Museum", "Horniman Museum and Gardens",
    "Wimbledon Lawn Tennis Museum", "Walthamstow Pump House Museum",
    "London Museum of Water and Steam", "Musical Museum", "Brunel Museum",
}
EXCLUDE_KIDS_PARKS = {
    "Postman's Park", "Old Paradise Gardens", "Pimlico Gardens",
    "King Square Gardens", "St Mary Magdalene Gardens",
    "Memorial Garden, Bromley-by-Bow Gasworks", "Burton’s Court",
}

# The source photo or map entry refers to an old identity, a closed venue, or
# one whose current status cannot be established confidently. Do not publish.
EXCLUDE_FOOD = {
    "Café Monico", "L'Atelier de Joël Robuchon", "Kettner's Restaurant",
    "Pollen Street Social", "Union Street Café", "Le Gavroche",
    "Locanda Locatelli", "Dell Restaurant", "The Magazine",
    "Maze Grill Royal Hospital Road", "Cafe Med", "Cocos",
}
EXCLUDE_NIGHTLIFE = {"Mahiki"}


def normalize(value):
    return re.sub(r"[^a-z0-9]", "", value.lower().replace("&", "and"))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidates-dir", required=True, type=Path)
    parser.add_argument("--write", action="store_true", help="Write merged data files after review")
    args = parser.parse_args()

    for section in SECTIONS:
        data_path = ROOT / "data" / f"{section}.json"
        data = json.loads(data_path.read_text())
        items = data["items"]
        candidates = json.loads((args.candidates_dir / f"tap-{section}-verified.json").read_text())["items"]
        existing_ids = {item["id"] for item in items}
        existing_names = {normalize(item["name"]) for item in items}
        seen_name_area = {(normalize(item["name"]), normalize(item.get("area", ""))) for item in items}
        seen_osm = {item.get("osmUrl") for item in items if item.get("osmUrl")}
        excluded = Counter()
        additions = []

        for item in candidates:
            name = item["name"]
            if section == "food" and name in EXCLUDE_FOOD:
                excluded["closed or uncertain food venue"] += 1
                continue
            if section == "nightlife" and name in EXCLUDE_NIGHTLIFE:
                excluded["closed club"] += 1
                continue
            if section == "kids" and item["category"] == "Museums" and name not in FAMILY_MUSEUMS:
                excluded["museum not clearly family focused"] += 1
                continue
            if section == "kids" and item["category"] == "Parks" and name in EXCLUDE_KIDS_PARKS:
                excluded["park not clearly suited to a family outing"] += 1
                continue
            if not all(item.get(key) for key in ("image", "imageCredit", "imageLicense", "imageSourceUrl", "osmUrl", "sourceUrl")):
                excluded["missing venue photo or provenance"] += 1
                continue

            key = normalize(name), normalize(item.get("area", ""))
            if (item["id"] in existing_ids or normalize(name) in existing_names
                    or key in seen_name_area or item["osmUrl"] in seen_osm):
                excluded["duplicate"] += 1
                continue
            seen_name_area.add(key)
            seen_osm.add(item["osmUrl"])
            if section == "kids" and item["category"] == "Museums":
                item["ageRange"] = "Check venue guidance"
            item["listingStatus"] = "Listed"
            item["partnerConfirmed"] = False
            additions.append(item)

        print(f"{section}: {len(items)} existing + {len(additions)} reviewed = {len(items) + len(additions)}; excluded {dict(excluded)}")
        if args.write:
            data["items"] = items + additions
            data_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
