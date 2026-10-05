'use client';

import { useEffect, useState } from 'react';
import DirectoryClient from '@/components/DirectoryClient';
import { fetchCollection } from '@/lib/firestore';

export default function PlacesPageClient({ initialItems }: { initialItems: any[] }) {
  const [items, setItems] = useState<any[]>(initialItems);
  const [loading, setLoading] = useState(false);

  const [loadFailed, setLoadFailed] = useState(initialItems.length === 0);

  const load = async () => {
    setLoading(true);
    setLoadFailed(false);
    // fetchCollection already retries internally on failure. If it still
    // comes back empty after that, show a retry option instead of silently
    // falling back to the JSON file bundled at build time - that file is a
    // snapshot from whenever it was last committed and does NOT reflect
    // admin edits, so falling back to it silently was showing visitors
    // stale content/images with no indication anything was wrong.
    const firebaseItems = await fetchCollection('places');
    if (firebaseItems && firebaseItems.length > 0) {
      setItems(firebaseItems);
    } else {
      setLoadFailed(true);
    }
    setLoading(false);
  };

  return (
    <section className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-9 max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-gold">Places</p>
          <h1 className="mt-3 font-heading text-5xl font-bold text-navy dark:text-cream">Best Places in London</h1>
          <p className="mt-5 text-lg leading-8 text-ink/70 dark:text-cream/70">Top attractions, hidden gems, iconic photo spots, and the best free things to do in London.</p>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(26,26,46,0.3)', fontFamily: "'DM Sans', sans-serif" }}>Loading...</div>
        ) : loadFailed ? (
          <div style={{ textAlign: 'center', padding: '60px', fontFamily: "'DM Sans', sans-serif" }}>
            <div style={{ color: 'rgba(26,26,46,0.5)', marginBottom: '16px' }}>Couldn't load places right now. Please try again.</div>
            <button onClick={load} style={{ background: '#1a1a2e', color: '#c9a84c', border: 'none', borderRadius: '10px', padding: '12px 24px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>Retry</button>
          </div>
        ) : (
          <DirectoryClient items={items} tabs={["Top Attractions", "Hidden Gems", "Photo Spots", "Free Things"]} mode="place" searchPlaceholder="Search places, areas, or attractions" />
        )}
      </div>
    </section>
  );
}
