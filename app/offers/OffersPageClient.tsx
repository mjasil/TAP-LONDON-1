'use client';

import { useEffect, useState } from 'react';
import { fetchCollection } from '@/lib/firestore';
import { availableCategories } from '@/lib/filterAvailability';

const CATEGORIES = ['All', 'Food Offers', 'Shopping Offers', 'Hotel Offers', 'Kids Offers', 'Student Offers', 'Family Deals', 'Weekend Deals'];

// These ongoing offers are backed by the issuer's own current page. The
// older CMS codes and anonymous "selected venues" claims lack a source, so
// displaying them as redeemable deals would mislead visitors.
const VERIFIED_OFFERS: Record<string, { name: string; description: string; discount: string; sourceUrl: string }> = {
  'family-travelcard': {
    name: 'Family & Friends Railcard',
    description: 'Save 1/3 on eligible adult rail fares and 60% on eligible child fares when travelling together. Check the railcard rules before purchasing.',
    discount: 'Rail savings',
    sourceUrl: 'https://www.familyandfriends-railcard.co.uk/',
  },
  'activities-theatre-offer': {
    name: 'Official London Theatre same-day tickets',
    description: 'Browse available same-day West End ticket deals directly from the official TKTS service. Prices and shows change daily.',
    discount: 'Daily deals',
    sourceUrl: 'https://officiallondontheatre.com/ticket-booth/',
  },
};

function verifiedOffer(item: any): any | null {
  const trusted = VERIFIED_OFFERS[item.id];
  if (trusted) return { ...item, ...trusted, code: undefined };
  if (!item.sourceUrl || !item.verifiedAt || !/^https:\/\//.test(item.sourceUrl)) return null;
  const verified = Date.parse(item.verifiedAt);
  if (!Number.isFinite(verified) || verified > Date.now() || Date.now() - verified > 30 * 86400000) return null;
  if (item.validUntil && item.validUntil < new Date().toISOString().slice(0, 10)) return null;
  return item;
}

export default function OffersPageClient({ initialItems }: { initialItems: any[] }) {
  const [items, setItems] = useState<any[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [copied, setCopied] = useState<string | null>(null);

  const [loadFailed, setLoadFailed] = useState(initialItems.length === 0);

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

  const verifiedItems = items.map(verifiedOffer).filter(Boolean);
  const filtered = verifiedItems.filter(o => activeCategory === 'All' || o.category === activeCategory);

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
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '1rem', color: 'rgba(255,255,255,0.55)' }}>Offers linked to their official source. Check today's price and terms before booking.</p>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 20px 80px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', flexWrap: 'wrap' }}>
          {availableCategories(verifiedItems, CATEGORIES, (item: any, cat) => item.category === cat).map(cat => (
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
        ) : filtered.length === 0 ? (
          <p className="py-14 text-center text-ink/70 dark:text-cream/70">No verified offers are available right now. Check back soon.</p>
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
                      <a href={offer.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-bold text-gold">Check official offer and terms →</a>
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
