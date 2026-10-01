'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { readSavedPlaces, SavedPlace, toggleSavedPlace } from '@/lib/savedPlaces';

export default function SavedPlacesPage() {
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  useEffect(() => {
    const refresh = () => setPlaces(readSavedPlaces());
    refresh();
    window.addEventListener('tap-saved-places', refresh);
    return () => window.removeEventListener('tap-saved-places', refresh);
  }, []);

  return <main className="min-h-screen bg-cream px-5 py-16 text-navy dark:bg-[#0d0d1a] dark:text-cream">
    <div className="mx-auto max-w-3xl">
      <h1 className="font-heading text-4xl font-bold">Saved places</h1>
      <p className="mt-3 text-sm opacity-70">Your list is saved on this device. Check opening hours before you go.</p>
      {places.length === 0 ? <p className="mt-10">No places saved yet. <Link href="/places" className="text-gold underline">Explore places</Link></p> :
        <div className="mt-8 grid gap-3">{places.map(place => <div key={place.key} className="flex items-center justify-between gap-4 rounded-xl bg-white p-5 shadow-sm dark:bg-[#1a1a2e]">
          <Link href={place.href} className="font-semibold hover:text-gold">{place.name}<span className="block text-xs opacity-60">{place.area}</span></Link>
          <button onClick={() => toggleSavedPlace(place)} className="text-xs font-semibold text-gold">Remove</button>
        </div>)}</div>}
    </div>
  </main>;
}
