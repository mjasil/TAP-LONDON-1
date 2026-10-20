'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchDocument } from '@/lib/firestore';
import PhotoCredit from '@/components/PhotoCredit';
import ListingSource from '@/components/ListingSource';
import { safeExternalUrl } from '@/lib/nightlifeListing';

type Section = 'hotels' | 'hiddenGems';

const SECTIONS = {
  hotels: { path: 'hotels', title: 'Hotels', notFound: 'Hotel not found' },
  hiddenGems: { path: 'hidden-gems', title: 'Hidden Gems', notFound: 'Hidden gem not found' },
} as const;

export default function SimpleListingDetail({ section }: { section: Section }) {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const config = SECTIONS[section];

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchDocument(section, id).then(result => {
      if (!mounted) return;
      setItem(result?.name ? result : null);
      setLoading(false);
    }).catch(() => {
      if (!mounted) return;
      setItem(null);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [section, id]);

  if (loading) return <main className="min-h-screen bg-[#f9f7f2] px-5 py-24 text-center dark:bg-[#0d0d1a]">Loading...</main>;

  if (!item) return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f9f7f2] dark:bg-[#0d0d1a]">
      <h1 className="font-serif text-3xl text-navy dark:text-white">{config.notFound}</h1>
      <Link href={`/${config.path}`} className="text-gold">← Back to {config.title}</Link>
    </main>
  );

  const details = section === 'hotels'
    ? [
        ['📍', 'Area', item.area || item.location],
        ['💷', 'Price range', item.priceRange],
        ['🚇', 'Nearest station', item.nearestStation],
        ['⭐', 'Rating', item.rating],
      ]
    : [
        ['📍', 'Area', item.area || item.location],
        ['💷', 'Entry', item.entryFee],
        ['🕐', 'Best time', item.bestTime],
        ['✨', 'Vibe', item.vibe],
      ];

  return (
    <main className="min-h-screen bg-[#f9f7f2] pb-16 dark:bg-[#0d0d1a]">
      <div className="relative mx-auto h-[42vh] min-h-[260px] max-h-[500px] max-w-[1400px] overflow-hidden bg-navy">
        {item.image && <img src={item.image} alt={item.name} className="h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-navy/95 via-navy/20 to-transparent" />
        <Link href={`/${config.path}`} className="absolute left-4 top-4 rounded-full border border-white/30 bg-navy/50 px-4 py-2 text-sm font-semibold text-white backdrop-blur">← Back</Link>
        <div className="absolute bottom-0 left-0 right-0 p-5">
          {item.category && <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gold">{item.category}</p>}
          <h1 className="font-serif text-3xl font-bold text-white sm:text-5xl">{item.name}</h1>
          {(item.area || item.location) && <p className="mt-2 text-sm text-white/80">📍 {item.area || item.location}</p>}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pt-5">
        <PhotoCredit item={item} />
        <div className="mb-5 grid grid-cols-1 gap-3 rounded-2xl bg-white p-5 shadow-sm sm:grid-cols-2 dark:bg-[#1a1a2e]">
          {details.filter(([, , value]) => value !== undefined && value !== null && value !== '').map(([icon, label, value]) => (
            <div key={label} className="flex gap-3">
              <span aria-hidden="true">{icon}</span>
              <div>
                <div className="text-xs font-semibold uppercase text-gray-500">{label}</div>
                <div className="text-sm font-semibold text-navy dark:text-white">{String(value)}</div>
              </div>
            </div>
          ))}
          {section === 'hotels' && Array.isArray(item.amenities) && item.amenities.length > 0 && (
            <div className="sm:col-span-2">
              <div className="text-xs font-semibold uppercase text-gray-500">Amenities</div>
              <p className="mt-1 text-sm text-navy dark:text-white">{item.amenities.join(' · ')}</p>
            </div>
          )}
        </div>

        {item.description && (
          <section className="mb-5 rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1a1a2e]">
            <h2 className="mb-2 font-serif text-2xl font-bold text-navy dark:text-white">About {item.name}</h2>
            <p className="leading-7 text-gray-700 dark:text-gray-300">{item.description}</p>
            <ListingSource item={item} />
          </section>
        )}

        {safeExternalUrl(item.websiteUrl) && (
          <a href={safeExternalUrl(item.websiteUrl)!} target="_blank" rel="noopener noreferrer" className="mb-3 block rounded-full bg-gold px-5 py-3 text-center font-bold text-navy">Official website ↗</a>
        )}
        {section === 'hotels' && safeExternalUrl(item.bookingUrl) && (
          <a href={safeExternalUrl(item.bookingUrl)!} target="_blank" rel="noopener noreferrer" className="mb-3 block rounded-full bg-gold px-5 py-3 text-center font-bold text-navy">Book hotel ↗</a>
        )}
        {safeExternalUrl(item.mapsUrl) && (
          <a href={safeExternalUrl(item.mapsUrl)!} target="_blank" rel="noopener noreferrer" className="mb-3 block rounded-full bg-navy px-5 py-3 text-center font-bold text-gold">📍 Get Directions on Google Maps</a>
        )}
        <Link href={`/${config.path}`} className="block rounded-full border-2 border-navy px-5 py-3 text-center font-semibold text-navy dark:border-white dark:text-white">← Back to {config.title}</Link>
      </div>
    </main>
  );
}
