const PROJECT_ID = 'tap-london';
const CACHE_MS = 60_000;
const collectionCache = new Map<string, { expires: number; request: Promise<any[] | null> }>();
const documentCache = new Map<string, { expires: number; request: Promise<any | null> }>();

// Recursively convert a single Firestore field value to a plain JS value
function parseFieldValue(field: any): any {
  if (!field) return undefined;
  if (field.stringValue !== undefined) return field.stringValue;
  if (field.integerValue !== undefined) return parseInt(field.integerValue);
  if (field.doubleValue !== undefined) return field.doubleValue;
  if (field.booleanValue !== undefined) return field.booleanValue;
  if (field.timestampValue !== undefined) return field.timestampValue;
  if (field.nullValue !== undefined) return null;
  if (field.mapValue !== undefined) {
    return parseFields(field.mapValue.fields || {});
  }
  if (field.arrayValue !== undefined) {
    return (field.arrayValue.values || []).map((v: any) => parseFieldValue(v));
  }
  return undefined;
}

function parseFields(fields: Record<string, any>): any {
  const obj: any = {};
  Object.keys(fields).forEach(key => {
    obj[key] = parseFieldValue(fields[key]);
  });
  return obj;
}

// If the main image is missing/empty, fall back to the first gallery photo
function applyImageFallback(item: any): any {
  if (!item.image && Array.isArray(item.gallery) && item.gallery.length > 0) {
    item.image = item.gallery[0];
  }
  return item;
}

export async function fetchCollection(collection: string): Promise<any[] | null> {
  const cached = collectionCache.get(collection);
  if (cached && cached.expires > Date.now()) return cached.request;

  const request = loadCollection(collection);
  collectionCache.set(collection, { expires: Date.now() + CACHE_MS, request });
  request.then(result => {
    if (!result && collectionCache.get(collection)?.request === request) collectionCache.delete(collection);
  });
  return request;
}

async function loadCollection(collection: string): Promise<any[] | null> {
  try {
    const documents: any[] = [];
    let pageToken = '';
    // Firestore list responses are paginated. The old one-page request hid
    // everything after the first 200 items, including new nightlife venues.
    do {
      const params = new URLSearchParams({ pageSize: '500' });
      if (pageToken) params.set('pageToken', pageToken);
      const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${encodeURIComponent(collection)}?${params}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return null;
      const json = await res.json();
      documents.push(...(json.documents || []));
      pageToken = json.nextPageToken || '';
    } while (pageToken && documents.length < 10000);

    if (documents.length === 0) return null;

    const items = documents.map((doc: any) => {
      const item = parseFields(doc.fields || {});
      const parts = doc.name.split('/');
      item.id = parts[parts.length - 1];
      return applyImageFallback(item);
    });

    items.sort((a: any, b: any) => (a.order ?? 999) - (b.order ?? 999));
    return items;
  } catch {
    return null;
  }
}

export async function fetchDocument(collection: string, id: string, retries = 2): Promise<any | null> {
  const key = `${collection}/${id}`;
  const cached = documentCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.request;

  const request = loadDocument(collection, id, retries);
  documentCache.set(key, { expires: Date.now() + CACHE_MS, request });
  request.then(result => {
    if (!result && documentCache.get(key)?.request === request) documentCache.delete(key);
  });
  return request;
}

async function loadDocument(collection: string, id: string, retries: number): Promise<any | null> {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${id}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        // A 404 means the document genuinely doesn't exist - e.g. a popup
        // config for a section that was never set up. Retrying that is
        // pointless (it will never succeed) and just adds console noise and
        // wasted requests. Only retry on transient failures (429 rate
        // limits, 5xx server errors, network issues) which CAN succeed on
        // a later attempt.
        if (res.status === 404) return null;
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
          continue;
        }
        return null;
      }
      const doc = await res.json();
      if (!doc.fields) return null;

      const item = parseFields(doc.fields);
      const parts = doc.name.split('/');
      item.id = parts[parts.length - 1];
      return applyImageFallback(item);
    } catch {
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
        continue;
      }
      return null;
    }
  }
  return null;
}
