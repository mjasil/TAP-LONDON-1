import { NextRequest, NextResponse } from 'next/server';
import { fetchDirectoryPage, normalizeDirectoryQuery } from '@/lib/directoryPage';
import { fetchCollection } from '@/lib/firestore';
import { listingRoute } from '@/lib/listingRoute';

export const dynamic = 'force-dynamic';

const LARGE_SECTIONS = ['places', 'food', 'shopping', 'nightlife', 'kids', 'hotels'] as const;
const SMALL_SECTIONS = [
  { collection: 'muslim', path: 'muslim', label: 'Muslim Guide' },
  { collection: 'offers', path: 'offers', label: 'Offer' },
  { collection: 'hiddenGems', path: 'hidden-gems', label: 'Hidden Gem' },
  { collection: 'trending', path: 'trending', label: 'Trending' },
  { collection: 'sports', path: 'sports', label: 'Sports' },
] as const;
type CursorState = Record<string, string | number | null>;

function decodeCursor(value: string | null): CursorState {
  if (!value || value.length > 1500) return {};
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function searchOptions(section: string, q: string) {
  const intent: Record<string, string[]> = {
    places: ['places', 'attractions', 'visit london'],
    food: ['food', 'restaurants', 'eat'],
    shopping: ['shopping', 'shops'],
    nightlife: ['nightlife', 'pubs', 'clubs', 'bars'],
    kids: ['kids', 'family', 'children'],
    hotels: ['hotels', 'stay', 'accommodation'],
  };
  if (intent[section]?.includes(q)) return { search: '' };
  if (q === 'free' && (section === 'places' || section === 'kids')) return { filter: 'free' };
  if (q === 'halal' && section === 'food') return { filter: 'halal' };
  if (q === 'rooftop' && section === 'nightlife') return { filter: 'rooftop' };
  if ((q === 'open late' || q === 'late night') && section === 'nightlife') return { filter: 'open-late' };
  return { search: q };
}

export async function GET(request: NextRequest) {
  const q = normalizeDirectoryQuery(request.nextUrl.searchParams.get('q') || '').slice(0, 60);
  if (q.length < 2) return NextResponse.json({ items: [], total: 0, nextCursor: null });

  const state = decodeCursor(request.nextUrl.searchParams.get('cursor'));
  const next: CursorState = {};
  try {
    const results = await Promise.all([
      ...LARGE_SECTIONS.map(async section => {
        if (state[section] === null) { next[section] = null; return { items: [], total: 0 }; }
        const cursor = typeof state[section] === 'string' ? state[section] : '';
        const page = await fetchDirectoryPage(section, { ...searchOptions(section, q), cursor, pageSize: 4 });
        next[section] = page.nextCursor;
        return {
          total: page.total,
          items: page.items.map(item => ({
            id: item.id, name: item.name, category: item.category || section,
            area: item.area || item.location || '', description: item.description || '',
            image: item.image || '', href: listingRoute(section, item.id), section,
          })),
        };
      }),
      ...SMALL_SECTIONS.map(async config => {
        const key = config.collection;
        if (state[key] === null) { next[key] = null; return { items: [], total: 0 }; }
        const offset = typeof state[key] === 'number' && state[key] >= 0 && state[key] < 10000 ? state[key] : 0;
        const rows = await fetchCollection(config.collection) || [];
        const matches = rows.filter(item => normalizeDirectoryQuery([
          item.name, item.category, item.area, item.location, item.description,
        ].filter(Boolean).join(' ')).includes(q));
        const selected = matches.slice(offset, offset + 2);
        next[key] = offset + selected.length < matches.length ? offset + selected.length : null;
        return {
          total: matches.length,
          items: selected.map(item => ({
            id: item.id, name: item.name, category: item.category || config.label,
            area: item.area || item.location || '', description: item.description || '',
            image: item.image || '', href: listingRoute(config.path, item.id), section: config.path,
          })),
        };
      }),
    ]);
    const items = results.reduce<Array<{ id: string; name: string; category: string; area: string; description: string; image: string; href: string; section: string }>>(
      (all, result) => { all.push(...result.items); return all; }, [],
    );
    const total = typeof state.__total === 'number' && state.__total >= 0
      ? state.__total : results.reduce((count, result) => count + result.total, 0);
    const hasMore = [...LARGE_SECTIONS, ...SMALL_SECTIONS.map(config => config.collection)]
      .some(section => next[section] !== null);
    next.__total = total;
    return NextResponse.json({
      items, total, nextCursor: hasMore ? Buffer.from(JSON.stringify(next)).toString('base64url') : null,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Global search failed:', error);
    return NextResponse.json({ error: 'Search is temporarily unavailable' }, { status: 503 });
  }
}
