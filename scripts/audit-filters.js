// Read-only audit: counts results for every tab and every tab+filter combo,
// replicating DirectoryClient.tsx filter logic exactly. Writes nothing to Firestore.
const admin = require('firebase-admin');
const fs = require('fs');
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)) });
const db = admin.firestore();

const PAGES = [
  { col: 'places', mode: 'place', tabs: ["Top Attractions","Hidden Gems","Photo Spots","Free Things"] },
  { col: 'food', mode: 'food', tabs: ["Restaurants","Halal Food","Coffee Shops","Local Spots"] },
  { col: 'shopping', mode: 'shopping', tabs: ["Shopping Areas","Markets","Souvenir Shops"] },
  { col: 'nightlife', mode: 'nightlife', tabs: ["Bars","Clubs","Live Music","Rooftop Bars"] },
  { col: 'kids', mode: 'kids', tabs: ["Parks","Museums","Activities","Entertainment"] },
  { col: 'muslim', mode: 'muslim', tabs: ["Mosques","Halal Food","Prayer Rooms","Islamic Sites"] },
  { col: 'emergency', mode: 'emergency', tabs: ["Hospitals","Police","Scam Alerts","Helplines"] },
];

const isOpenNow = i => { if (!i.openingHours) return false; const h = i.openingHours.toLowerCase(); if (h.includes('24')) return true; return h.includes('daily') || h.includes('mon') || h.includes('open'); };
const isOpenLate = i => i.openLate === true || /2[2-3]:00|midnight|late|24 hour/.test((i.openingHours||'').toLowerCase());
const isFree = i => { const f=(i.entryFee||'').toLowerCase(); if (/\u00a3\s?\d/.test(f)) return false; return i.priceType==='Free' || /\bfree\b/i.test(f); };
const common = { 'Open Now': isOpenNow, 'Open Late': isOpenLate, 'Free': isFree, 'Near Station': i => !!i.nearestStation };
const byMode = {
  food: { 'Halal': i=>!!i.halal||!!i.verifiedHalal||(i.tags||[]).includes('halal'), 'Cheap Eats': i=>i.priceRange==='£'||(i.tags||[]).includes('cheap-eats'), 'Date Night': i=>i.vibe==='Date night'||(i.tags||[]).includes('date-night'), 'Family': i=>i.vibe==='Family'||(i.tags||[]).includes('family'), 'Viral': i=>(i.tags||[]).includes('viral'), 'Hidden Gem': i=>i.vibe==='Hidden gem'||(i.tags||[]).includes('hidden-gem') },
  muslim: { 'Halal': i=>!!i.halal||!!i.verifiedHalal },
  kids: { 'Free': isFree, 'Indoor': i=>/museum|indoor|aquarium/i.test(i.category||''), 'Outdoor': i=>/park|zoo|garden|outdoor/i.test(i.category||'') },
  nightlife: { 'Rooftop': i=>/rooftop/i.test(i.category||''), 'Free Entry': i=>/free/i.test(i.entryFee||''), 'Open Late': isOpenLate },
  place: { 'Free': i=>i.priceType==='Free', 'Special Offer': i=>!!i.offerTag||!!i.offer },
};

(async () => {
  const out = [];
  for (const p of PAGES) {
    const snap = await db.collection(p.col).get();
    const items = snap.docs.map(d => d.data());
    const filters = { ...common, ...(byMode[p.mode]||{}) };
    out.push(`\n### ${p.col} (${items.length} total)`);
    const cats = {}; items.forEach(i => { const k = i.category ?? i.section ?? i.sport ?? '(none)'; cats[k]=(cats[k]||0)+1; });
    out.push('categories in data: ' + JSON.stringify(cats));
    for (const t of p.tabs) {
      const tabItems = items.filter(i => (i.category ?? i.section ?? i.sport) === t);
      const row = [`${t}: ${tabItems.length}`];
      for (const [name, fn] of Object.entries(filters)) row.push(`${name}=${tabItems.filter(fn).length}`);
      out.push('  ' + row.join(' | '));
    }
  }
  fs.writeFileSync('filter-audit.txt', out.join('\n') + '\n');
  console.log(out.join('\n'));
})().catch(e => { console.error(e); process.exit(1); });
