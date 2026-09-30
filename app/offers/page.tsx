'use client';

import { useEffect, useState } from 'react';
import { fetchCollection } from '@/lib/firestore';
import { availableCategories } from '@/lib/filterAvailability';

const CATEGORIES = ['All', 'Food Offers', 'Shopping Offers', 'Hotel Offers', 'Kids Offers', 'Student Offers', 'Family Deals', 'Weekend Deals'];

export default function OffersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [copied, setCopied] = useState<string | null>(null);

  const [loadFailed, setLoadFailed] = useState(false);

  const load = () => {
    setLoading(true);
    setLoadFailed(false);
    fetchCollection('offers').then(data => {
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

  const filtered = items.filter(o => activeCategory === 'All' || o.category === activeCategory);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <main className="bg-[#f9f7f2] dark:bg-[#0d0d1a]" style={{ minHeight: '100vh' }}>
      <div style={{ background: '#1a1a2e', padding: '60px 20px 40px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', color: '#c9a84c', fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase' as const, marginBottom: '10px' }}>Offers & Deals</p>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 700, color: '#ffffff', margin: '0 0 14px' }}>London Offers</h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '1rem', color: 'rgba(255,255,255,0.55)' }}>The best deals, discounts and offers across London — updated regularly.</p>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 20px 80px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', flexWrap: 'wrap' }}>
          {availableCategories(items, CATEGORIES, (item: any, cat) => item.category === cat).map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} style={{ padding: '8px 16px', borderRadius: '40px', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: '0.78rem', fontWeight: 600, background: activeCategory === cat ? '#c9a84c' : 'rgba(26,26,46,0.08)', color: activeCategory === cat ? '#1a1a2e' : '#666', transition: 'all 0.2s' }}>{cat}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(26,26,46,0.3)', fontFamily: "'DM Sans', sans-serif" }}>Loading offers...</div>
        ) : loadFailed ? (
          <div style={{ textAlign: 'center', padding: '60px', fontFamily: "'DM Sans', sans-serif" }}>
            <div style={{ color: 'rgba(26,26,46,0.5)', marginBottom: '16px' }}>Couldn't load this right now. Please try again.</div>
            <button onClick={load} style={{ background: '#1a1a2e', color: '#c9a84c', border: 'none', borderRadius: '10px', padding: '12px 24px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>Retry</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filtered.map(offer => (
              <div key={offer.id} className="bg-white dark:bg-[#1a1a2e]" style={{ borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.07)', border: '1px solid rgba(201,168,76,0.15)', display: 'flex' }}>
                <div style={{ width: '120px', flexShrink: 0, position: 'relative' }}>
                  <img src={offer.image} alt={offer.name} style={{ width: '100%', height: '100%', objectFit: 'cover', minHeight: '110px' }} />
                  <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'linear-gradient(135deg,#c9a84c,#f0d07a)', color: '#1a1a2e', padding: '3px 10px', borderRadius: '20px', fontFamily: "'DM Sans', sans-serif", fontSize: '0.68rem', fontWeight: 700 }}>{offer.discount}</div>
                </div>
                <div style={{ flex: 1, padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <h3 className="text-navy dark:text-[#f9f7f2]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem', fontWeight: 700, margin: '0 0 4px' }}>{offer.name}</h3>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.68rem', color: '#888', marginBottom: '8px' }}>📍 {offer.area} · {offer.category}</p>
                      <p className="text-[#555] dark:text-[#bbb]" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.78rem', lineHeight: 1.6 }}>{offer.description}</p>
                    </div>
                    {offer.code && (
                      <button onClick={() => copyCode(offer.code, offer.id)} style={{ flexShrink: 0, background: copied === offer.id ? '#7ac9a0' : 'rgba(201,168,76,0.1)', border: '1px dashed rgba(201,168,76,0.4)', color: copied === offer.id ? '#fff' : '#c9a84c', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: '0.74rem', fontWeight: 700, textAlign: 'center' as const, minWidth: '80px' }}>
                        {copied === offer.id ? '✓ Copied!' : offer.code}
                      </button>
                    )}
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
