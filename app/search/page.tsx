'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchCollection } from '@/lib/firestore';
import { listingRoute } from '@/lib/listingRoute';

const SECTION_CONFIG: { collection: string; type: string; hrefBase: string; label: string; color: string }[] = [
  { collection: 'places',      type: 'place',      hrefBase: '/places',      label: 'Place',      color: '#c9a84c' },
  { collection: 'food',        type: 'food',        hrefBase: '/food',        label: 'Food',        color: '#d4956a' },
  { collection: 'shopping',    type: 'shopping',    hrefBase: '/shopping',    label: 'Shopping',    color: '#9ab8d4' },
  { collection: 'nightlife',   type: 'nightlife',   hrefBase: '/nightlife',   label: 'Nightlife',   color: '#b18ad4' },
  { collection: 'kids',        type: 'kids',        hrefBase: '/kids',        label: 'Kids',        color: '#7ac9a0' },
  { collection: 'muslim',      type: 'muslim',      hrefBase: '/muslim',      label: 'Muslim Guide', color: '#6abf8f' },
  { collection: 'hotels',      type: 'hotels',      hrefBase: '/hotels',      label: 'Hotel',       color: '#d4a574' },
  { collection: 'offers',      type: 'offers',      hrefBase: '/offers',      label: 'Offer',       color: '#e8b020' },
  { collection: 'hiddenGems',  type: 'hidden-gems', hrefBase: '/hidden-gems', label: 'Hidden Gem',  color: '#9d7ad4' },
  { collection: 'trending',    type: 'trending',    hrefBase: '/trending',    label: 'Trending',    color: '#e55a5a' },
  { collection: 'sports',      type: 'sports',      hrefBase: '/sports',      label: 'Sports',      color: '#5ab0e5' },
];

type IntentRule = { keywords: string[]; test: (item: any) => boolean; boost: number };

const INTENT_RULES: IntentRule[] = [
  { keywords: ['halal'], test: (i) => i.halal === 'halal', boost: 40 },
  { keywords: ['cheap', 'budget', 'affordable', 'low cost', 'inexpensive'],
    test: (i) => (i.priceType || '').toLowerCase() === 'free' || (i.priceRangeLevel ?? 9) <= 1, boost: 35 },
  { keywords: ['free'], test: (i) => (i.priceType || '').toLowerCase() === 'free', boost: 45 },
  { keywords: ['luxury', 'expensive', 'high end', 'premium', '5 star', 'five star'],
    test: (i) => (i.priceRangeLevel ?? 0) >= 3 || (i.category || '').toLowerCase().includes('5-star'), boost: 35 },
  { keywords: ['family', 'kids', 'children'], test: (i) => i.type === 'kids' || i.familyFriendly, boost: 30 },
  { keywords: ['rooftop'], test: (i) => /rooftop/i.test(i.name + ' ' + i.description + ' ' + i.tags), boost: 30 },
  { keywords: ['late night', 'late', 'midnight', 'after hours'],
    test: (i) => /late|midnight|24[- ]?hour/i.test(i.description + ' ' + i.tags), boost: 25 },
  { keywords: ['hidden gem', 'hidden gems', 'secret', 'unusual', 'off the beaten path'],
    test: (i) => i.type === 'hidden-gems', boost: 40 },
  { keywords: ['best', 'top', 'top rated', 'must see', 'must-see'],
    test: (i) => (i.rating ?? 0) >= 4 || (i.category || '').toLowerCase().includes('top'), boost: 20 },
  { keywords: ['hotel', 'hotels', 'stay', 'accommodation'], test: (i) => i.type === 'hotels', boost: 25 },
];

function scoreMatch(item: any, query: string): number {
  const q = query.toLowerCase();
  const name = (item.name || '').toLowerCase();
  const haystack = [item.category, item.area, item.description, item.cuisine, item.tags, item.halal, item.priceType]
    .join(' ')
    .toLowerCase();

  let score = 0;
  if (name === q) score += 100;
  else if (name.startsWith(q)) score += 60;
  else if (name.includes(q)) score += 35;

  const words = q.split(/\s+/).filter(Boolean);
  words.forEach(w => {
    if (name.includes(w)) score += 12;
    if (haystack.includes(w)) score += 6;
  });

  for (const rule of INTENT_RULES) {
    const matchedKeyword = rule.keywords.some(kw => q.includes(kw));
    if (matchedKeyword && rule.test(item)) {
      score += rule.boost;
    }
  }

  return score;
}

function SearchResults() {
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get('q') || '';
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      const all: any[] = [];
      await Promise.all(
        SECTION_CONFIG.map(async (cfg) => {
          const items = await fetchCollection(cfg.collection);
          if (!items) return;
          items.forEach((item: any) => {
            const priceStr = (item.priceRange || '').toString();
            all.push({
              id: item.id,
              name: item.name,
              category: item.category || item.section || item.sport || cfg.label,
              area: item.area || item.location || '',
              description: item.description || '',
              cuisine: item.cuisine || '',
              tags: Array.isArray(item.tags) ? item.tags.join(' ') : '',
              halal: item.halal === true || item.halal === 'halal' || item.verifiedHalal === true ? 'halal' : '',
              priceType: item.priceType || '',
              priceRangeLevel: (priceStr.match(/£/g) || []).length,
              rating: parseFloat(item.rating) || 0,
              familyFriendly: !!item.familyFriendly,
              type: cfg.type,
              href: listingRoute(cfg.hrefBase, item.id),
              image: item.image,
              label: cfg.label,
              color: cfg.color,
            });
          });
        })
      );
      if (cancelled) return;
      const scored = all
        .map(item => ({ ...item, score: scoreMatch(item, q) }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 60);
      setResults(scored);
      setLoading(false);
    }
    if (q.trim().length >= 2) run();
    else { setResults([]); setLoading(false); }
    return () => { cancelled = true; };
  }, [q]);

  return (
    <main className="bg-[#f9f7f2] dark:bg-[#0d0d1a]" style={{ minHeight: '100vh' }}>
      <div style={{ background: '#1a1a2e', padding: '50px 20px 34px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', color: '#c9a84c', fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase' as const, marginBottom: '10px' }}>Search</p>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(1.6rem, 4vw, 2.6rem)', fontWeight: 700, color: '#ffffff', margin: '0 0 8px' }}>
            {q ? `Results for "${q}"` : 'Search TAP LONDON'}
          </h1>
          {!loading && q && (
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
              {results.length} {results.length === 1 ? 'result' : 'results'} found
            </p>
          )}
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 20px 80px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(26,26,46,0.3)', fontFamily: "'DM Sans', sans-serif" }}>Searching...</div>
        ) : results.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(26,26,46,0.4)', fontFamily: "'DM Sans', sans-serif" }}>
            {q ? `No results for "${q}". Try a different search.` : 'Type something to search.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '18px' }}>
            {results.map((r, i) => (
              <Link key={r.type + r.id + i} href={r.href} style={{ textDecoration: 'none' }}>
                <div className="bg-white dark:bg-[#1a1a2e]" style={{ borderRadius: '14px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid rgba(201,168,76,0.1)', cursor: 'pointer' }}>
                  {r.image && (
                    <div style={{ height: '150px', overflow: 'hidden' }}>
                      <img src={r.image} alt={r.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <div style={{ padding: '14px' }}>
                    <div style={{
                      display: 'inline-block', fontFamily: "'DM Sans', sans-serif", fontSize: '0.62rem', fontWeight: 700,
                      letterSpacing: '0.8px', textTransform: 'uppercase' as const, color: r.color,
                      background: `${r.color}18`, padding: '3px 8px', borderRadius: '20px', marginBottom: '8px',
                    }}>{r.label}</div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.15rem', fontWeight: 700, color: '#1a1a2e' }} className="dark:text-white">{r.name}</div>
                    {r.area && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.72rem', color: '#888', marginTop: '4px' }}>📍 {r.area}</p>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0d0d1a' }} />}>
      <SearchResults />
    </Suspense>
  );
}
