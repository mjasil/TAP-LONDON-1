"""Refresh the broad nightlife directory from the FSA's public register.

Run: python scripts/import-fsa-nightlife.py
The FSA classifies these businesses together as "Pub/bar/nightclub"; this
import deliberately does not guess which individual subtype a venue is.
Curated TAP listings in data/nightlife.json are retained unchanged.
"""

import json
import argparse
import re
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

DATA_FILE = Path(__file__).resolve().parents[1] / 'data' / 'nightlife.json'
API = 'https://api.ratings.food.gov.uk/Establishments'
BOROUGHS = (
    'Westminster', 'Camden', 'Islington', 'Hackney', 'Tower Hamlets',
    'Southwark', 'Lambeth', 'Kensington and Chelsea',
    'Hammersmith and Fulham', 'Wandsworth', 'Greenwich', 'Lewisham',
    'Newham', 'Haringey',
)
EXCLUDE = re.compile(
    r'\b(theatre|cinema|school|college|university|gym|fitness|stadium|'
    r'clubhouse|sports centre|restaurant|cafe|coffee|canteen|hospital|'
    r'care home|masonic|golf club|football club|social club|'
    r'limited|ltd|f\.c|caff[eé])\b', re.I,
)

# Stock nightlife scenes already used by TAP. These are illustrative only:
# FSA records do not provide photographs of the individual venues.
ILLUSTRATIVE_IMAGES = (
    'https://images.pexels.com/photos/941861/pexels-photo-941861.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/1183434/pexels-photo-1183434.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/1540406/pexels-photo-1540406.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/1749900/pexels-photo-1749900.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/1449791/pexels-photo-1449791.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/1540338/pexels-photo-1540338.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/1666816/pexels-photo-1666816.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'https://images.pexels.com/photos/713149/pexels-photo-713149.jpeg?auto=compress&cs=tinysrgb&w=1200',
)


def illustrative_image(fhrs_id):
    return ILLUSTRATIVE_IMAGES[int(fhrs_id) % len(ILLUSTRATIVE_IMAGES)]


def normalized(name):
    return re.sub(r'[^a-z0-9]', '', name.lower())


def fetch_page(number):
    params = urllib.parse.urlencode({
        'latitude': 51.5074, 'longitude': -0.1278, 'maxDistanceLimit': 8,
        'businessTypeId': 7843, 'pageNumber': number, 'pageSize': 500,
    })
    request = urllib.request.Request(
        f'{API}?{params}',
        headers={'x-api-version': '2', 'accept': 'application/json'},
    )
    with urllib.request.urlopen(request, timeout=45) as response:
        return json.load(response)


def make_listing(row, accessed):
    name = ' '.join(row['BusinessName'].split())
    postcode = row['PostCode'].strip().upper()
    address = ', '.join(dict.fromkeys(
        p.strip() for p in (row.get('AddressLine1'), row.get('AddressLine2'),
                            row.get('AddressLine3'), row.get('AddressLine4'))
        if p and p.strip() and p.strip().lower() != 'london'
    ))
    lat = float(row['geocode']['latitude'])
    lng = float(row['geocode']['longitude'])
    directions = urllib.parse.urlencode({'api': 1, 'query': f'{lat},{lng}'})
    return {
        'id': f"fsa-{row['FHRSID']}",
        'name': name,
        'category': 'Pubs, Bars & Clubs',
        'area': f"{row['LocalAuthorityName']}, {postcode}",
        'description': f"{address}, {postcode}. Check opening hours and events with the venue before visiting." if address else f"{postcode}. Check opening hours and events with the venue before visiting.",
        'mapsUrl': f'https://www.google.com/maps/search/?{directions}',
        'listingStatus': 'Listed',
        'sourceName': 'Food Standards Agency',
        'sourceUrl': f"https://ratings.food.gov.uk/business/{row['FHRSID']}",
        'sourceAccessed': accessed,
        'image': illustrative_image(row['FHRSID']),
        'imageIsIllustrative': True,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input-dir', type=Path, help='Directory containing tap-fsa-venues-pN.json downloads')
    args = parser.parse_args()
    pages = []
    def read_page(number):
        if args.input_dir:
            return json.loads((args.input_dir / f'tap-fsa-venues-p{number}.json').read_text())
        return fetch_page(number)

    first = read_page(1)
    pages.extend(first['establishments'])
    for page in range(2, first['meta']['totalPages'] + 1):
        pages.extend(read_page(page)['establishments'])

    data = json.loads(DATA_FILE.read_text(encoding='utf-8'))
    curated = [item for item in data['items'] if not item['id'].startswith('fsa-')]
    curated_names = {normalized(item['name']) for item in curated}
    groups = defaultdict(list)
    for row in pages:
        name = ' '.join((row.get('BusinessName') or '').split())
        borough = row.get('LocalAuthorityName')
        if (borough not in BOROUGHS or not name or len(name) < 4
                or EXCLUDE.search(name) or normalized(name) in curated_names
                or not row.get('PostCode') or not row.get('geocode', {}).get('latitude')
                or not row.get('geocode', {}).get('longitude')):
            continue
        # The current register contains older inspections too. Prioritise
        # recent records; an inspection date is never treated as opening hours.
        if (row.get('RatingDate') or '')[:4] < '2025':
            continue
        groups[borough].append(row)

    for rows in groups.values():
        rows.sort(key=lambda row: (row.get('RatingDate') or '', row['BusinessName']), reverse=True)

    chosen = []
    seen = set()
    # Rotate through boroughs so the 430 listings do not all come from one area.
    while len(chosen) < 430 and any(groups.values()):
        for borough in BOROUGHS:
            if not groups[borough] or len(chosen) >= 430:
                continue
            row = groups[borough].pop(0)
            key = (normalized(row['BusinessName']), row['PostCode'].replace(' ', '').upper())
            if key in seen:
                continue
            seen.add(key)
            chosen.append(row)

    if len(chosen) < 330:
        raise RuntimeError(f'Only {len(chosen)} eligible records; leaving existing data untouched')

    accessed = datetime.now(timezone.utc).date().isoformat()
    listings = [make_listing(row, accessed) for row in chosen]
    data['items'] = curated + listings
    DATA_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'{len(curated)} curated + {len(listings)} FSA listings = {len(data["items"])} venues')


if __name__ == '__main__':
    main()
