'use client';

import { useEffect, useState } from 'react';
import { fetchCollection } from '@/lib/firestore';
import { availableCategories } from '@/lib/filterAvailability';
import Link from 'next/link';

const CATEGORIES = ['All', '5-star', '4-star', 'Budget', 'Family', 'Spa', 'Luxury'];
const AMENITY_FILTERS = ['Pool', 'Spa', 'Family Friendly', 'Restaurant', 'Gym'];

export default function HotelsPageClient({ initialItems }: { initialItems: any[] }) {
  const [items, setItems] = useState<any[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');

  const [loadFailed, setLoadFailed] = useState(initialItems.length === 0);

  const load = () => {
    setLoading(true);
    setLoadFailed(false);
    fetchCollection('hotels').then(data => {
      if (data && data.length > 0) {
        setItems(data);
      } else {
        setLoadFailed(true);
      }
      setLoading(false);
    });
  };

  const filtered = items.filter(h => {
    const matchCat = activeCategory === 'All' 
      || h.category === activeCategory
      || (activeCategory === 'Spa' && (h.amenities || []).some((a: string) => /spa/i.test(a)));
    const matchSearch = !search || h.name.toLowerCase().includes(search.toLowerCase()) || h.area?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <main className="bg-[#f9f7f2] dark:bg-[#0d0d1a]" style={{ minHeight: '100vh' }}>
      {/* Hero */}
      <div style={{ background: '#1a1a2e', padding: '60px 20px 40px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', color: '#c9a84c', fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase' as const, marginBottom: '10px' }}>Hotels</p>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 700, color: '#ffffff', margin: '0 0 14px' }}>London Hotels</h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '1rem', color: 'rgba(255,255,255,0.55)', marginBottom: '28px' }}>From budget to luxury — find the perfect hotel in London.</p>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search hotels or areas..."
            style={{ width: '100%', maxWidth: '500px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50px', padding: '13px 20px', color: '#fff', fontFamily: "'DM Sans', sans-serif", fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' as const }}
          />
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 20px 80px' }}>
        {/* Category tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', flexWrap: 'wrap' }}>
          {availableCategories(items, CATEGORIES, (hotel: any, cat) =>
            hotel.category === cat || (cat === 'Spa' && (hotel.amenities || []).some((a: string) => /spa/i.test(a)))
          ).map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} style={{ padding: '8px 20px', borderRadius: '40px', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: '0.82rem', fontWeight: 600, background: activeCategory === cat ? '#c9a84c' : 'rgba(26,26,46,0.08)', color: activeCategory === cat ? '#1a1a2e' : '#666', transition: 'all 0.2s' }}>{cat}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(26,26,46,0.3)', fontFamily: "'DM Sans', sans-serif" }}>Loading hotels...</div>
        ) : loadFailed ? (
          <div style={{ textAlign: 'center', padding: '60px', fontFamily: "'DM Sans', sans-serif" }}>
            <div style={{ color: 'rgba(26,26,46,0.5)', marginBottom: '16px' }}>Couldn't load hotels right now. Please try again.</div>
            <button onClick={load} style={{ background: '#1a1a2e', color: '#c9a84c', border: 'none', borderRadius: '10px', padding: '12px 24px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>Retry</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {filtered.map(hotel => (
              <div key={hotel.id} className="bg-white dark:bg-[#1a1a2e]" style={{ borderRadius: '14px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid rgba(201,168,76,0.1)' }}>
                <div style={{ position: 'relative', height: '180px' }}>
                  <img src={hotel.image} alt={hotel.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'linear-gradient(135deg,#c9a84c,#f0d07a)', color: '#1a1a2e', padding: '4px 12px', borderRadius: '20px', fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', fontWeight: 700 }}>{hotel.category}</div>
                  <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '4px 10px', borderRadius: '20px', fontFamily: "'DM Sans', sans-serif", fontSize: '0.72rem', fontWeight: 600 }}>⭐ {hotel.rating}</div>
                </div>
                <div style={{ padding: '16px' }}>
                  <h3 className="text-navy dark:text-[#f9f7f2]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.2rem', fontWeight: 700, margin: '0 0 6px' }}>{hotel.name}</h3>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.72rem', color: '#888', marginBottom: '8px' }}>📍 {hotel.area}</p>
                  <p className="text-[#555] dark:text-[#bbb]" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.8rem', lineHeight: 1.6, marginBottom: '12px' }}>{hotel.description}</p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {(hotel.amenities || []).slice(0,4).map((a: string) => (
                      <span key={a} style={{ background: 'rgba(201,168,76,0.1)', color: '#c9a84c', borderRadius: '20px', padding: '2px 10px', fontSize: '0.64rem', fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>{a}</span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem', fontWeight: 700, color: '#c9a84c' }}>{hotel.priceRange}</div>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.66rem', color: '#888' }}>🚇 {hotel.nearestStation}</div>
                    </div>
                    <a href={hotel.bookingUrl || hotel.mapsUrl} target="_blank" rel="noreferrer" style={{ background: '#1a1a2e', color: '#c9a84c', padding: '9px 18px', borderRadius: '8px', fontFamily: "'DM Sans', sans-serif", fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none' }}>Book Now</a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
