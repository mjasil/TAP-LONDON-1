'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { fetchCollection } from '@/lib/firestore';

type AreaGroup = { region: string; areas: string[] };

// Grouped the same way Visit London structures it: Central / North / South / East / West
const AREA_GROUPS: AreaGroup[] = [
  { region: 'Central London', areas: ['Soho', 'Covent Garden', 'Mayfair', 'Westminster', 'Marylebone', 'Fitzrovia', 'Holborn', 'Bloomsbury', 'City of London', 'Clerkenwell'] },
  { region: 'West London', areas: ['Notting Hill', 'Kensington', 'Chelsea', 'Paddington', 'Bayswater', 'Knightsbridge', 'Hammersmith', 'Shepherd\'s Bush', 'Fulham'] },
  { region: 'North London', areas: ['Camden', 'Islington', 'Hampstead', 'King\'s Cross', 'Highbury', 'Stoke Newington', 'Dalston'] },
  { region: 'East London', areas: ['Shoreditch', 'Hackney', 'Whitechapel', 'Bethnal Green', 'Stratford', 'Bow', 'Mile End'] },
  { region: 'South London', areas: ['South Bank', 'London Bridge', 'Borough', 'Greenwich', 'Brixton', 'Peckham', 'Clapham', 'Wimbledon', 'Richmond'] },
];

const CATEGORY_COLLECTIONS = [
  { collection: 'places', hrefBase: '/places', label: 'Places', icon: '🏛️' },
  { collection: 'food', hrefBase: '/food', label: 'Food', icon: '🍽️' },
  { collection: 'nightlife', hrefBase: '/nightlife', label: 'Nightlife', icon: '🌙' },
  { collection: 'hotels', hrefBase: '/hotels', label: 'Hotels', icon: '🏨' },
  { collection: 'shopping', hrefBase: '/shopping', label: 'Shopping', icon: '🛍️' },
  { collection: 'kids', hrefBase: '/kids', label: 'Kids & Family', icon: '👨‍👩‍👧' },
  { collection: 'hiddenGems', hrefBase: '/hidden-gems', label: 'Hidden Gems', icon: '💎' },
];

export default function AreasPage() {
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const requestId = useRef(0);

  const handleSelectArea = async (area: string) => {
    const currentRequest = ++requestId.current;
    setSelectedArea(area);
    setLoading(true);
    setLoadFailed(false);
    try {
      const groups = await Promise.all(CATEGORY_COLLECTIONS.map(async c => {
        // Hidden gems is still a small collection. The larger directories use
        // indexed, bounded area-prefix queries instead of full downloads.
        let items: any[];
        if (c.collection === 'hiddenGems') {
          items = await fetchCollection(c.collection) || [];
        } else {
          const response = await fetch(`/api/directory/${c.collection}?q=${encodeURIComponent(area)}`, { cache: 'no-store' });
          if (!response.ok) throw new Error('Directory unavailable');
          items = (await response.json()).items || [];
        }
        return [c.collection, items.filter((item: any) =>
          String(item.area || item.location || '').toLowerCase().includes(area.toLowerCase())).slice(0, 6)] as const;
      }));
      if (currentRequest !== requestId.current) return;
      setResults(Object.fromEntries(groups.filter(([, items]) => items.length > 0)));
    } catch {
      if (currentRequest !== requestId.current) return;
      setLoadFailed(true);
      setResults({});
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  };

  return (
    <main className="bg-[#f9f7f2] dark:bg-[#0d0d1a]" style={{ minHeight: '100vh' }}>
      <div style={{ background: '#1a1a2e', padding: '60px 20px 40px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', color: '#c9a84c', fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase' as const, marginBottom: '10px' }}>Explore</p>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 700, color: '#ffffff', margin: '0 0 14px' }}>London by Area</h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '1rem', color: 'rgba(255,255,255,0.55)' }}>Explore Central, North, South, East and West London — find places, food, hotels and more in each neighbourhood.</p>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 20px 80px' }}>
        {!selectedArea ? (
          AREA_GROUPS.map(group => (
            <div key={group.region} style={{ marginBottom: '36px' }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.5rem', fontWeight: 700, color: '#1a1a2e', marginBottom: '14px' }} className="dark:text-white">
                {group.region}
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '10px' }}>
                {group.areas.map(area => (
                  <button
                    key={area}
                    onClick={() => handleSelectArea(area)}
                    style={{
                      padding: '10px 18px', borderRadius: '40px', border: '1px solid rgba(201,168,76,0.3)',
                      background: 'rgba(201,168,76,0.08)', color: '#1a1a2e', cursor: 'pointer',
                      fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', fontWeight: 600,
                    }}
                    className="dark:text-white dark:border-gold/30"
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div>
            <button
              onClick={() => { requestId.current++; setSelectedArea(null); setResults({}); setLoadFailed(false); setLoading(false); }}
              style={{
                background: 'rgba(26,26,46,0.08)', border: 'none', color: '#1a1a2e',
                borderRadius: '50px', padding: '8px 18px', fontFamily: "'DM Sans', sans-serif",
                fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', marginBottom: '20px'
              }}
              className="dark:bg-white/10 dark:text-white"
            >
              ← All areas
            </button>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 700, color: '#1a1a2e', marginBottom: '24px' }} className="dark:text-white">
              {selectedArea}
            </h2>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(26,26,46,0.3)', fontFamily: "'DM Sans', sans-serif" }}>Loading...</div>
            ) : loadFailed ? (
              <div role="alert" style={{ textAlign: 'center', padding: '60px', color: '#9b3b3b', fontFamily: "'DM Sans', sans-serif" }}>
                Listings could not be loaded. <button onClick={() => handleSelectArea(selectedArea)} style={{ color: '#9b762a', textDecoration: 'underline' }}>Try again</button>
              </div>
            ) : Object.keys(results).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(26,26,46,0.4)', fontFamily: "'DM Sans', sans-serif" }}>
                No listings found for {selectedArea} yet — check back soon as we add more content.
              </div>
            ) : (
              CATEGORY_COLLECTIONS.filter(c => results[c.collection]).map(cat => (
                <div key={cat.collection} style={{ marginBottom: '32px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.8rem', fontWeight: 700, color: '#9b762a', textTransform: 'uppercase' as const, letterSpacing: '1px' }}>
                      {cat.icon} {cat.label}
                    </h3>
                    <Link href={cat.collection === 'hiddenGems' ? cat.hrefBase : `${cat.hrefBase}?search=${encodeURIComponent(selectedArea)}`} style={{ color: '#9b762a', fontWeight: 700, fontSize: '0.8rem' }}>See all →</Link>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
                    {results[cat.collection].map((item: any) => (
                      <Link key={item.id} href={`${cat.hrefBase}/${encodeURIComponent(item.id)}`} style={{ textDecoration: 'none' }}>
                        <div className="bg-white dark:bg-[#1a1a2e]" style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', cursor: 'pointer' }}>
                          {item.image && (
                            <div style={{ height: '120px', overflow: 'hidden' }}>
                              <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                          )}
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
        )}
      </div>
    </main>
  );
}
