#!/usr/bin/env python3
"""Audit London bar/photo coverage using official bulk open-data downloads.

Inputs: Geofabrik Greater London free shapefile ZIP (OpenStreetMap, ODbL)
and Geograph's gridimage_base-by-myriad TQ MySQL dump (CC BY-SA 2.0).
The output is a review queue, never a publishable listing feed: matching a
photo title and coordinates does not establish that the pictured venue is open.
"""

import argparse
import collections
import csv
import gzip
import json
import math
import re
import struct
import zipfile
from datetime import date
from pathlib import Path


def normalise(value):
    return re.sub(r"[^a-z0-9]", "", value.lower().replace("&", "and"))


def distance_m(a, b):
    return math.hypot((a["lat"] - b["lat"]) * 111_000,
                      (a["lon"] - b["lon"]) * 69_000)


def mapped_bars(filename):
    bars = []
    with zipfile.ZipFile(filename) as archive:
        for base, kind in (("gis_osm_pois_free_1", "node"),
                           ("gis_osm_pois_a_free_1", "way")):
            dbf = archive.read(base + ".dbf")
            shx = archive.read(base + ".shx")
            shp = archive.read(base + ".shp")
            count = struct.unpack_from("<I", dbf, 4)[0]
            header = struct.unpack_from("<H", dbf, 8)[0]
            size = struct.unpack_from("<H", dbf, 10)[0]
            # Verify the Geofabrik free POI schema rather than silently read
            # incorrect fields if a future extract changes its layout.
            fields = [dbf[pos:pos + 11].split(b"\0")[0].decode("ascii")
                      for pos in range(32, header - 1, 32)]
            if fields != ["osm_id", "code", "fclass", "name"] or size != 145:
                raise ValueError(f"Unexpected Geofabrik POI schema: {fields}")
            for index in range(count):
                row = dbf[header + index * size:header + (index + 1) * size]
                if row[0:1] == b"*" or row[17:45].decode("ascii").strip() != "bar":
                    continue
                name = row[45:145].decode("utf-8", "replace").strip()
                if not name:
                    continue
                offset = struct.unpack_from(">I", shx, 100 + index * 8)[0] * 2
                if kind == "node":
                    lon, lat = struct.unpack_from("<dd", shp, offset + 12)
                else:
                    west, south, east, north = struct.unpack_from("<dddd", shp, offset + 12)
                    lon, lat = (west + east) / 2, (south + north) / 2
                bars.append({"osmUrl": f"https://www.openstreetmap.org/{kind}/"
                             + row[1:13].decode("ascii").strip(),
                             "name": name, "lat": lat, "lon": lon})
    return bars


def photos(filename):
    with gzip.open(filename, "rt", encoding="latin1") as source:
        for line in source:
            if not line.startswith(("INSERT INTO", "(")):
                continue
            values = line.split(" VALUES ", 1)[-1].strip().rstrip(",;")
            if not values.startswith("(") or not values.endswith(")"):
                continue
            try:
                row = next(csv.reader([values[1:-1]], delimiter=",",
                                      quotechar="'", escapechar="\\"))
            except csv.Error:
                continue
            if len(row) != 12:
                continue
            image_id, _, photographer, title, status, taken, _, _, _, lat, lon, _ = row
            if status not in {"geograph", "accepted"} or not taken[:4].isdigit():
                continue
            if int(taken[:4]) < 2018 or not (51.25 <= float(lat) <= 51.70
                                             and -0.55 <= float(lon) <= 0.35):
                continue
            yield {"photoSourceUrl": f"https://www.geograph.org.uk/photo/{image_id}",
                   "photoTitle": title, "photoCredit": photographer,
                   "photoTaken": taken, "lat": float(lat), "lon": float(lon)}


def audit(bars, photos_iter, existing):
    cells = collections.defaultdict(list)
    for bar in bars:
        cells[round(bar["lat"] * 100), round(bar["lon"] * 100)].append(bar)
    results = {}
    for photo in photos_iter:
        lat, lon = round(photo["lat"] * 100), round(photo["lon"] * 100)
        for x in range(lat - 1, lat + 2):
            for y in range(lon - 1, lon + 2):
                for bar in cells[x, y]:
                    name = normalise(bar["name"])
                    if len(name) < 8 or name in existing or name not in normalise(photo["photoTitle"]):
                        continue
                    distance = distance_m(bar, photo)
                    if distance > 50:
                        continue
                    key = bar["osmUrl"]
                    candidate = {**bar, **{k: v for k, v in photo.items()
                                            if k not in {"lat", "lon"}},
                                 "photoDistanceMeters": round(distance),
                                 "reviewStatus": "Unverified; inspect photo, opening status and reuse rights"}
                    if key not in results or (photo["photoTaken"], -distance) > (
                            results[key]["photoTaken"], -results[key]["photoDistanceMeters"]):
                        results[key] = candidate
    return sorted(results.values(), key=lambda row: row["name"].lower())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--geofabrik-zip", required=True, type=Path)
    parser.add_argument("--geograph-tq", required=True, type=Path)
    parser.add_argument("--existing", type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    existing = set()
    if args.existing:
        existing = {normalise(item["name"]) for item in
                    json.loads(args.existing.read_text())["items"]}
    bars = mapped_bars(args.geofabrik_zip)
    candidates = audit(bars, photos(args.geograph_tq), existing)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps({"checkedAt": date.today().isoformat(),
                                      "mappedBarFeatures": len(bars),
                                      "candidates": candidates}, indent=2,
                                     ensure_ascii=False) + "\n")
    print(f"{len(bars)} named mapped bar features; {len(candidates)} tentative "
          f"photo matches for manual review. No listings were published.")


if __name__ == "__main__":
    main()
