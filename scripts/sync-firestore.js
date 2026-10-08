// Automated sync script: reads JSON data files from this repo and writes
// them to Firestore, run on a schedule via GitHub Actions instead of the
// manual "Import JSON -> Firebase" button in admin.
//
// Safety rule (same as the admin panel fix): for items that ALREADY exist
// in Firestore, this NEVER overwrites image, gallery, or description -
// those are the fields edited by hand in the admin panel. It only fills in
// other fields (price, hours, tags, etc.) and adds brand new items in full.

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const PROTECTED_FIELDS = ['image', 'gallery', 'description', 'imageCredit', 'imageSourceUrl', 'imageLicense', 'imageLicenseUrl'];
// Nightlife enrichment and partnership details are maintained in admin. The
// scheduled seed sync must not roll them back on an existing listing.
const NIGHTLIFE_ADMIN_FIELDS = [
  'listingStatus', 'partnerConfirmed', 'contactStatus', 'tapRating', 'tapReview',
  'tapOfferText', 'tapOfferUrl', 'tapOfferExpires', 'tonightEventName',
  'tonightEventDate', 'eventUrl', 'musicType', 'priceRange', 'openingNights',
  'websiteUrl', 'bookingUrl', 'instagramUrl', 'tiktokUrl', 'nearestStation',
  'vibe', 'audience', 'agePolicy', 'imageCredit', 'imageIsIllustrative',
];

// Maps a data/<file>.json name to its actual Firestore collection name.
// Mirrors getCollectionName() in the admin panel.
const COLLECTION_MAP = {
  'hidden-gems': 'hiddenGems',
};

function getCollectionName(section) {
  return COLLECTION_MAP[section] || section;
}

function slugify(str) {
  return str.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function syncSection(sectionFile) {
  const filePath = path.join(__dirname, '..', 'data', `${sectionFile}.json`);
  if (!fs.existsSync(filePath)) {
    console.log(`Skipped ${sectionFile} - file not found`);
    return;
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw);
  const items = data.items || data.venues || (Array.isArray(data) ? data : []);
  if (!items.length) {
    console.log(`Skipped ${sectionFile} - no items`);
    return;
  }

  const collectionName = getCollectionName(sectionFile);
  const colRef = db.collection(collectionName);

  const existingSnap = await colRef.get();
  const existingIds = new Set(existingSnap.docs.map(d => d.id));

  // The broad FSA nightlife import was withdrawn. Remove only its previously
  // synced documents that are no longer in the JSON, leaving curated and
  // admin-created nightlife listings alone.
  if (sectionFile === 'nightlife') {
    const desiredIds = new Set(items.map((item, i) => item.id || slugify(item.name || `item-${i}`)));
    const withdrawn = existingSnap.docs.filter(d =>
      d.id.startsWith('fsa-') &&
      d.data().sourceName === 'Food Standards Agency' &&
      !desiredIds.has(d.id)
    );
    for (let offset = 0; offset < withdrawn.length; offset += 400) {
      const cleanup = db.batch();
      withdrawn.slice(offset, offset + 400).forEach(d => cleanup.delete(d.ref));
      await cleanup.commit();
    }
    if (withdrawn.length) console.log(`nightlife: removed ${withdrawn.length} withdrawn FSA listings`);
  }

  // Load tombstones for this collection - items deliberately deleted in
  // admin that must NOT be re-added just because they're still present in
  // the JSON file. Without this check, every deleted item would silently
  // come back on the next scheduled sync run.
  const tombstoneSnap = await db.collection('deletedItems')
    .where('collection', '==', collectionName)
    .get();
  const deletedIds = new Set(tombstoneSnap.docs.map(d => d.data().itemId));

  let batch = db.batch();
  let count = 0;
  let added = 0;
  let updated = 0;
  let skippedDeleted = 0;

  for (let i = 0; i < items.length; i++) {
    const item = { ...items[i] };
    const id = item.id || slugify(item.name || `item-${i}`);

    if (!existingIds.has(id) && deletedIds.has(id)) {
      skippedDeleted++;
      continue;
    }

    const ref = colRef.doc(id);

    if (existingIds.has(id)) {
      PROTECTED_FIELDS.forEach(f => delete item[f]);
      if (sectionFile === 'nightlife') NIGHTLIFE_ADMIN_FIELDS.forEach(f => delete item[f]);
      if (Object.keys(item).length === 0) continue;
      batch.set(ref, item, { merge: true });
      updated++;
    } else {
      batch.set(ref, { ...item, order: i }, { merge: true });
      added++;
    }

    count++;
    if (count === 400) {
      await batch.commit();
      batch = db.batch();
      count = 0;
    }
  }

  if (count > 0) await batch.commit();
  console.log(`${sectionFile}: ${added} new, ${updated} updated, ${skippedDeleted} skipped (previously deleted)`);
}

const SECTIONS = [
  'places', 'food', 'shopping', 'nightlife', 'hotels', 'kids',
  'muslim', 'emergency', 'offers', 'hidden-gems', 'trending',
  'sports', 'guides', 'events', 'theatre', 'universities',
  'daytrips', 'music',
];

async function main() {
  console.log('Starting scheduled Firestore sync...');
  for (const section of SECTIONS) {
    try {
      await syncSection(section);
    } catch (e) {
      console.error(`Error syncing ${section}:`, e.message);
    }
  }
  console.log('Sync complete.');
  process.exit(0);
}

main();
