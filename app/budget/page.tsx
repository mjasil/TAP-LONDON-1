'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchCollection } from '@/lib/firestore';

const COLLECTIONS = [
  { collection: 'places', hrefBase: '/places', label: 'Free Attractions', icon: '🏛️' },
  { collection: 'food', hrefBase: '/food', label: 'Budget Eats', icon: '🍽️' },
  { collection: 'hiddenGems', hrefBase: '/hidden-gems', label: 'Free Hidden Gems', icon: '💎' },
  { collection: 'hotels', hrefBase: '/hotels', label: 'Budget Hotels', icon: '🏨' },
  { collection: 'kids', hrefBase: '/kids', label: 'Free Kids Activities', icon: '👨‍👩‍👧' },
];

function isFree(item: any) {
  const p = (item.priceType || '').toLowerCase();
  return p === 'free';
}

function isCheap(item: any) {
  const pr = (item.priceRange || '').toString();
  const level = (pr.match(/£/g) || []).length;
  return level > 0 && level <= 1;
}

function budgetCardImage(image: string): string {
  try {
    const url = new URL(image);
    if (url.hostname === 'res.cloudinary.com' && url.pathname.includes('/image/upload/')) {
      return image.replace('/image/upload/', '/image/upload/c_fill,w_560,h_300/');
    }
    if (url.hostname === 'images.unsplash.com') {
      url.searchParams.set('w', '560');
      url.searchParams.set('q', '75');
      return url.toString();
    }
    if (url.hostname === 'images.pexels.com') {
      url.searchParams.set('w', '560');
      url.searchParams.set('auto', 'compress');
      return url.toString();
    }
  } catch { /* Preserve an admin-supplied URL if it cannot be transformed. */ }
  return image;
}

function BudgetCardImage({ item, eager }: { item: any; eager: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [item.image]);

  return (
    <div style={{ height: '120px', overflow: 'hidden', position: 'relative', background: '#293541' }}>
      {item.image && !failed ? (
        <img src={budgetCardImage(item.image)} alt={item.name} width={560} height={300}
          loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div role="img" aria-label={`Photo unavailable for ${item.name}`} style={{ height: '100%', display: 'grid', placeItems: 'center', color: '#fff', fontSize: '0.75rem' }}>Photo unavailable</div>
      )}
      <div style={{ position: 'absolute', top: '8px', left: '8px', background: isFree(item) ? 'rgba(122,201,160,0.95)' : 'rgba(0,0,0,0.6)', color: isFree(item) ? '#1a1a2e' : '#fff', padding: '3px 10px', borderRadius: '20px', fontSize: '0.62rem', fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>
        {isFree(item) ? 'FREE' : 'BUDGET'}
      </div>
    </div>
  );
}

export default function BudgetPage() {
  const [grouped, setGrouped] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    // Let each section appear as soon as its collection arrives. One slow
    // collection should not hold back all the other cards.
    void Promise.all(COLLECTIONS.map(async cfg => {
      try {
        const items = await fetchCollection(cfg.collection) || [];
        const filtered = items.filter((item: any) => isFree(item) || isCheap(item));
        if (active && filtered.length > 0) {
          setGrouped(current => ({ ...current, [cfg.collection]: filtered.slice(0, 8) }));
        }
      } catch { /* Other sections may still load. */ }
    })).then(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <main className="bg-[#f9f7f2] dark:bg-[#0d0d1a]" style={{ minHeight: '100vh' }}>
      <div style={{ background: '#1a1a2e', padding: '60px 20px 40px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', color: '#c9a84c', fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase' as const, marginBottom: '10px' }}>Save Money</p>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 700, color: '#ffffff', margin: '0 0 14px' }}>London on a Budget</h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '1rem', color: 'rgba(255,255,255,0.55)' }}>Free attractions, budget eats and low-cost stays — see the best of London without breaking the bank.</p>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 20px 80px' }}>
        {loading && Object.keys(grouped).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(26,26,46,0.3)', fontFamily: "'DM Sans', sans-serif" }}>Loading...</div>
        ) : Object.keys(grouped).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(26,26,46,0.4)', fontFamily: "'DM Sans', sans-serif" }}>No budget listings found yet.</div>
        ) : (
          COLLECTIONS.filter(c => grouped[c.collection]).map(cfg => (
            <div key={cfg.collection} style={{ marginBottom: '36px' }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.5rem', fontWeight: 700, color: '#1a1a2e', marginBottom: '14px' }} className="dark:text-white">
                {cfg.icon} {cfg.label}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
                {grouped[cfg.collection].map((item: any, index: number) => (
                  <Link key={item.id} href={`${cfg.hrefBase}/${item.id}`} style={{ textDecoration: 'none' }}>
                    <div className="bg-white dark:bg-[#1a1a2e]" style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', cursor: 'pointer' }}>
                      <BudgetCardImage item={item} eager={cfg.collection === 'places' && index < 4} />
                      <div style={{ padding: '12px' }}>
                        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', fontWeight: 700, color: '#1a1a2e' }} className="dark:text-white">{item.name}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
