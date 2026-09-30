'use client';

import { useEffect, useState } from 'react';
import { fetchCollection } from '@/lib/firestore';
import { availableCategories } from '@/lib/filterAvailability';
import Link from 'next/link';

const CATEGORIES = ['All', 'Hidden Spots', 'Secret Gardens', 'Unique Experiences', 'Hidden Neighbourhoods'];

export default function HiddenGemsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  const [loadFailed, setLoadFailed] = useState(false);

  const load = () => {
    setLoading(true);
    setLoadFailed(false);
    fetchCollection('hiddenGems').then(data => {
      if (data && data.length > 0) {
        setItems(data);
      } else {
        setLoadFailed(true);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = items.filter(i => activeCategory === 'All' || i.category === activeCategory);

  return (
    <main className="bg-[#f9f7f2] dark:bg-[#0d0d1a]" style={{ minHeight: '100vh' }}>
      <div style={{ background: '#1a1a2e', padding: '60px 20px 40px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', color: '#c9a84c', fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase' as const, marginBottom: '10px' }}>Hidden Gems</p>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 700, color: '#ffffff', margin: '0 0 14px' }}>London's Hidden Gems</h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '1rem', color: 'rgba(255,255,255,0.55)' }}>Secret spots, quiet corners and off-the-beaten-track places the crowds haven't found yet.</p>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 20px 80px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', flexWrap: 'wrap' }}>
          {availableCategories(items, CATEGORIES, (item: any, cat) => item.category === cat).map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} style={{ padding: '8px 16px', borderRadius: '40px', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: '0.78rem', fontWeight: 600, background: activeCategory === cat ? '#c9a84c' : 'rgba(26,26,46,0.08)', color: activeCategory === cat ? '#1a1a2e' : '#666', transition: 'all 0.2s' }}>{cat}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(26,26,46,0.3)', fontFamily: "'DM Sans', sans-serif" }}>Loading...</div>
         ) : loadFailed ? (
          <div style={{ textAlign: 'center', padding: '60px', fontFamily: "'DM Sans', sans-serif" }}>
            <div style={{ color: 'rgba(26,26,46,0.5)', marginBottom: '16px' }}>Couldn't load this right now. Please try again.</div>
            <button onClick={load} style={{ background: '#1a1a2e', color: '#c9a84c', border: 'none', borderRadius: '10px', padding: '12px 24px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>Retry</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {filtered.map((gem, i) => (
              <div key={gem.id} className="bg-white dark:bg-[#1a1a2e]" style={{ borderRadius: '14px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid rgba(201,168,76,0.1)' }}>
                <div style={{ position: 'relative', height: '180px' }}>
                  <img src={gem.image} alt={gem.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' }} />
                  {(() => {
                    const feeRaw = (gem.entryFee ?? '').toString().trim().toLowerCase();
                    const isFree = feeRaw === '' || feeRaw === 'free' || feeRaw === '0' || feeRaw === '£0' || feeRaw === 'no charge';
                    return (
                      <div style={{ position: 'absolute', top: '12px', left: '12px', background: isFree ? 'rgba(122,201,160,0.9)' : 'rgba(26,26,46,0.85)', color: isFree ? '#1a1a2e' : '#c9a84c', padding: '3px 10px', borderRadius: '20px', fontFamily: "'DM Sans', sans-serif", fontSize: '0.68rem', fontWeight: 700 }}>
                        {isFree ? 'FREE' : (gem.entryFee || 'PAID')}
                      </div>
                    );
                  })()}
                  <div style={{ position: 'absolute', bottom: '12px', left: '12px', right: '12px' }}>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>{gem.name}</div>
                  </div>
                </div>
                <div style={{ padding: '14px' }}>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', color: '#888', marginBottom: '8px' }}>📍 {gem.area}</p>
                  <p className="text-[#555] dark:text-[#bbb]" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.8rem', lineHeight: 1.6, marginBottom: '10px' }}>{gem.description}</p>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                    <span style={{ background: 'rgba(201,168,76,0.1)', color: '#c9a84c', borderRadius: '20px', padding: '2px 10px', fontSize: '0.64rem', fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>{gem.vibe}</span>
                  </div>
                  {gem.bestTime && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.72rem', color: '#888' }}>⏰ Best time: {gem.bestTime}</p>}
                  {gem.mapsUrl && <a href={gem.mapsUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: '10px', color: '#c9a84c', fontFamily: "'DM Sans', sans-serif", fontSize: '0.76rem', fontWeight: 600, textDecoration: 'none' }}>📍 Get Directions →</a>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
