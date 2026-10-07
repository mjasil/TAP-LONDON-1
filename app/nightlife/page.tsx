'use client';

import { useEffect, useState } from 'react';
import DirectoryClient from '@/components/DirectoryClient';
import { fetchCollection } from '@/lib/firestore';

export default function NightlifePage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [loadFailed, setLoadFailed] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadFailed(false);
    const firebaseItems = await fetchCollection('nightlife');
    if (firebaseItems && firebaseItems.length > 0) {
      setItems(firebaseItems);
    } else {
      setLoadFailed(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const tonightPicks = items.filter((i: any) => i.openLate === true).slice(0, 4);

  return (
    <section className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-9 max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-gold">Nightlife</p>
          <h1 className="mt-3 font-heading text-5xl font-bold text-navy dark:text-cream">London Nightlife</h1>
          <p className="mt-5 text-lg leading-8 text-ink/70 dark:text-cream/70">Explore bars, pubs, clubs and live music across London. {items.length > 0 ? `${items.length} places to browse.` : ''}</p>
        </div>

        {!loading && tonightPicks.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #1a1a2e, #2d2d4e)', borderRadius: '20px',
            padding: '24px', marginBottom: '32px', border: '1px solid rgba(201,168,76,0.25)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#7ac9a0', boxShadow: '0 0 8px #7ac9a0' }} />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', fontWeight: 700, color: '#7ac9a0', letterSpacing: '1.5px', textTransform: 'uppercase' as const }}>Late-night venues — check opening hours</span>
            </div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.6rem', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>London after dark 🌙</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {tonightPicks.map((venue: any) => (
                <a key={venue.id} href={venue.mapsUrl || `/nightlife/${venue.id}`} target="_blank" rel="noreferrer" style={{
                  display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none',
                  background: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '10px',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  {venue.image && (
                    <div style={{ width: '44px', height: '44px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                      <img src={venue.image} alt={venue.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.82rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>{venue.name}</div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.66rem', color: 'rgba(255,255,255,0.5)' }}>{venue.openingHours || 'Open late'}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(26,26,46,0.3)', fontFamily: "'DM Sans', sans-serif" }}>Loading...</div>
        ) : (
          <>
            <DirectoryClient items={items} tabs={["Bars", "Clubs", "Live Music", "Rooftop Bars", "Pubs, Bars & Clubs"]} mode="nightlife" searchPlaceholder="Search venues or areas" />
            {items.some(item => item.sourceName === 'Food Standards Agency') && (
              <p className="mt-10 text-xs leading-6 text-ink/60 dark:text-cream/60">
                Some listed venues use Food Standards Agency register data under the{' '}
                <a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/" target="_blank" rel="noreferrer" className="underline">Open Government Licence</a>.
                Opening hours, events and availability can change; check with the venue before visiting.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
