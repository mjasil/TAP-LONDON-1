// Recover Wikidata coordinates already captured in the Maps link by our
// reviewed importer. No geocoding, centroid guessing, or third-party photos.
// Run without --write to audit; --write only adds missing coordinate fields.
const fs = require('node:fs');
const path = require('node:path');

const SECTIONS = ['places', 'food', 'nightlife', 'kids'];

function sourceCoordinates(item) {
  if (!/^wd-q\d+$/.test(item.id || '') ||
      !/Wikidata/.test(item.sourceName || '') ||
      item.sourceUrl !== `https://www.wikidata.org/wiki/${item.id.slice(3).toUpperCase()}`) return null;
  try {
    const url = new URL(item.mapsUrl);
    if (url.protocol !== 'https:' || url.hostname !== 'www.google.com' ||
        url.pathname !== '/maps/search/' || url.searchParams.get('api') !== '1') return null;
    const match = /^(-?\d+\.\d+),(-?\d+\.\d+)$/.exec(url.searchParams.get('query') || '');
    if (!match) return null;
    const latitude = Number(match[1]);
    const longitude = Number(match[2]);
    if (latitude < 51.35 || latitude > 51.7 || longitude < -0.55 || longitude > 0.25) return null;
    return { latitude, longitude };
  } catch { return null; }
}

function main(write = false) {
  for (const section of SECTIONS) {
    const filename = path.join(__dirname, '..', 'data', `${section}.json`);
    const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
    let changed = 0;
    for (const item of data.items) {
      if (item.latitude != null || item.longitude != null) continue;
      const coords = sourceCoordinates(item);
      if (!coords) continue;
      Object.assign(item, coords);
      changed++;
    }
    if (write && changed) fs.writeFileSync(filename, JSON.stringify(data, null, 2) + '\n');
    console.log(`${section}: ${changed} source-backed coordinate pairs ${write ? 'added' : 'available'}`);
  }
}

if (require.main === module) main(process.argv.includes('--write'));
module.exports = { sourceCoordinates };
