// Firestore's single array-contains index supports category, one quick filter,
// and prefix search together without loading a whole collection in the browser.
function normalize(value) {
  return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function filtersFor(item, section) {
  const result = [];
  const fee = String(item.entryFee || '');
  if (section === 'places' || section === 'kids') {
    if ((item.priceType === 'Free' || /^free(?: entry)?$/i.test(fee)) && !/£\s?\d/.test(fee)) result.push('free');
  }
  if (section === 'kids') {
    if (/museum|aquarium|indoor/i.test(item.category || '')) result.push('indoor');
    if (/park|zoo|garden|outdoor/i.test(item.category || '')) result.push('outdoor');
  }
  if (section === 'food') {
    if (item.halal === true || item.verifiedHalal === true || (item.tags || []).includes('halal')) result.push('halal');
    if (item.priceRange === '£' || (item.tags || []).includes('cheap-eats')) result.push('cheap');
  }
  if (section === 'nightlife') {
    if (/rooftop/i.test(item.category || '')) result.push('rooftop');
    if (item.openLate === true || /2[2-3]:00|midnight|late|24 hour/i.test(item.openingHours || '')) result.push('open-late');
  }
  return result;
}

function prefixesFor(item) {
  const phrases = [item.name, item.area, item.location, item.category, item.cuisine, item.type]
    .map(normalize).filter(Boolean);
  const prefixes = new Set();
  for (const phrase of phrases) {
    for (const part of [phrase, ...phrase.split(' ')]) {
      for (let length = 2; length <= Math.min(part.length, 30); length++) {
        prefixes.add(part.slice(0, length));
      }
    }
  }
  return [...prefixes].slice(0, 140);
}

function directoryKeys(item, section) {
  const category = normalize(item.category || item.section || '');
  const filters = filtersFor(item, section);
  const keys = new Set();
  for (const filter of filters) {
    keys.add(`f:${filter}`);
    if (category) keys.add(`cf:${category}:${filter}`);
  }
  for (const prefix of prefixesFor(item)) {
    keys.add(`q:${prefix}`);
    if (category) keys.add(`cq:${category}:${prefix}`);
    for (const filter of filters) {
      keys.add(`fq:${filter}:${prefix}`);
      if (category) keys.add(`cfq:${category}:${filter}:${prefix}`);
    }
  }
  return [...keys];
}

module.exports = { directoryKeys, normalize, filtersFor };
