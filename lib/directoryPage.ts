import { parseFields } from './firestore';

const PROJECT_ID = 'tap-london';
const ROOT = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const REFERENCE_ROOT = `projects/${PROJECT_ID}/databases/(default)/documents`;
const SECTIONS = new Set(['places', 'food', 'nightlife', 'kids', 'hotels', 'shopping']);
const CARD_FIELDS = [
  'name', 'category', 'section', 'area', 'location', 'description', 'image',
  'imageCredit', 'imageLicense', 'imageIsIllustrative', 'mapsUrl', 'openingHours',
  'entryFee', 'priceType', 'priceRange', 'cuisine', 'type', 'icon', 'halal',
  'verifiedHalal', 'mustTry', 'vibe', 'opinion', 'tags', 'nearestStation', 'phone',
  'recommended', 'familyFriendlyBadge', 'listingStatus', 'partnerConfirmed',
  'musicType', 'openLate', 'offer', 'offerText',
];
export const DIRECTORY_PAGE_SIZE = 24;

export type DirectoryPage = {
  items: any[];
  total: number;
  nextCursor: string | null;
};

export function normalizeDirectoryQuery(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function filterKey(category: string, search: string, filter: string): string | null {
  const cat = normalizeDirectoryQuery(category === 'All' ? '' : category);
  const q = normalizeDirectoryQuery(search).slice(0, 30);
  const facet = normalizeDirectoryQuery(filter).replace(/ /g, '-');
  if (q.length >= 2) {
    if (cat && facet) return `cfq:${cat}:${facet}:${q}`;
    if (cat) return `cq:${cat}:${q}`;
    if (facet) return `fq:${facet}:${q}`;
    return `q:${q}`;
  }
  if (facet) return cat ? `cf:${cat}:${facet}` : `f:${facet}`;
  return null;
}

function queryFor(section: string, category: string, search: string, filter: string, cursor?: string) {
  const key = filterKey(category, search, filter);
  const where = key
    ? { fieldFilter: { field: { fieldPath: 'directoryKeys' }, op: 'ARRAY_CONTAINS', value: { stringValue: key } } }
    : category && category !== 'All'
      ? { fieldFilter: { field: { fieldPath: 'category' }, op: 'EQUAL', value: { stringValue: category } } }
      : undefined;
  const common: any = {
    from: [{ collectionId: section }],
    orderBy: [{ field: { fieldPath: '__name__' }, direction: 'ASCENDING' }],
    ...(where ? { where } : {}),
  };
  if (cursor && /^[a-z0-9][a-z0-9_-]{0,100}$/i.test(cursor)) {
    common.startAt = {
      values: [{ referenceValue: `${REFERENCE_ROOT}/${section}/${cursor}` }],
      before: false,
    };
  }
  return common;
}

async function firestorePost(endpoint: string, body: object) {
  const response = await fetch(`${ROOT}:${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Firestore ${endpoint} failed (${response.status})`);
  return response.json();
}

export async function fetchDirectoryPage(
  section: string,
  { category = 'All', search = '', filter = '', cursor = '', pageSize = DIRECTORY_PAGE_SIZE }:
    { category?: string; search?: string; filter?: string; cursor?: string; pageSize?: number } = {},
): Promise<DirectoryPage> {
  if (!SECTIONS.has(section)) throw new Error('Unknown directory section');
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > DIRECTORY_PAGE_SIZE) {
    throw new Error('Invalid directory page size');
  }
  const base = queryFor(section, category, search, filter);
  const page = queryFor(section, category, search, filter, cursor);
  const [pageRows, countRows] = await Promise.all([
    firestorePost('runQuery', {
      structuredQuery: {
        ...page,
        select: { fields: CARD_FIELDS.map(fieldPath => ({ fieldPath })) },
        limit: pageSize + 1,
      },
    }),
    firestorePost('runAggregationQuery', {
      structuredAggregationQuery: {
        structuredQuery: base,
        aggregations: [{ alias: 'total', count: {} }],
      },
    }),
  ]);
  const docs = pageRows.filter((row: any) => row.document).map((row: any) => row.document);
  const visible = docs.slice(0, pageSize);
  return {
    items: visible.map((doc: any) => ({
      ...parseFields(doc.fields || {}),
      id: doc.name.split('/').at(-1),
    })),
    total: Number(countRows[0]?.result?.aggregateFields?.total?.integerValue || 0),
    nextCursor: docs.length > pageSize ? visible.at(-1)?.name.split('/').at(-1) || null : null,
  };
}
