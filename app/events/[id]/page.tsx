'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchDocument } from '@/lib/firestore';
import { isPublishedEvent } from '@/lib/verifiedEvent';
import { safeExternalUrl } from '@/lib/nightlifeListing';
import PhotoCredit from '@/components/PhotoCredit';
import ListingSource from '@/components/ListingSource';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchDocument('events', id).then(item => {
      if (active) { setEvent(isPublishedEvent(item) ? item : null); setLoading(false); }
    }).catch(() => {
      if (active) { setEvent(null); setLoading(false); }
    });
    return () => { active = false; };
  }, [id]);

  if (loading) return <main className="min-h-screen bg-cream px-5 py-24 text-center dark:bg-[#0d0d1a]">Loading event...</main>;
  if (!event) return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream px-5 text-center dark:bg-[#0d0d1a]">
      <h1 className="font-heading text-3xl font-bold text-navy dark:text-cream">Event unavailable</h1>
      <p className="text-ink/70 dark:text-cream/70">This event may have ended or its details have not been verified recently.</p>
      <Link href="/events" className="font-bold text-gold">← Back to What’s On</Link>
    </main>
  );

  const info = [
    ['📍', 'Area', event.area],
    ['📅', 'Date', event.startDate === event.endDate ? event.startDate : `${event.startDate} to ${event.endDate}`],
    ['🕐', 'Time (London)', event.time],
    ['💷', 'Price', event.price],
    ['👤', 'Organiser', event.organiser],
    ['🔞', 'Minimum age', event.minimumAge],
    ['♿', 'Accessibility', event.accessibility],
    ['🏠', 'Address', event.address],
  ];

  return (
    <main className="min-h-screen bg-cream pb-16 dark:bg-[#0d0d1a]">
      <div className="relative mx-auto h-[40vh] min-h-[260px] max-h-[480px] max-w-[1400px] overflow-hidden bg-navy">
        {event.image && event.imageRightsConfirmed === true && <img src={event.image} alt={event.name} className="h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-navy/95 to-transparent" />
        <Link href="/events" className="absolute left-4 top-4 rounded-full border border-white/30 bg-navy/50 px-4 py-2 text-sm font-semibold text-white">← Back</Link>
        <div className="absolute bottom-0 p-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gold">{event.category}</p>
          <h1 className="font-heading text-3xl font-bold text-white sm:text-5xl">{event.name}</h1>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 pt-5">
        {event.imageRightsConfirmed === true && <PhotoCredit item={event} />}
        <div className="mb-5 grid gap-4 rounded-2xl bg-white p-5 shadow-sm sm:grid-cols-2 dark:bg-[#1a1a2e]">
          {info.filter(([, , value]) => value).map(([icon, label, value]) => (
            <div key={label} className="flex gap-3">
              <span aria-hidden="true">{icon}</span>
              <div><div className="text-xs font-bold uppercase text-gray-500">{label}</div><div className="text-sm font-semibold text-navy dark:text-white">{value}</div></div>
            </div>
          ))}
        </div>
        <section className="mb-5 rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1a1a2e]">
          <h2 className="mb-2 font-heading text-2xl font-bold text-navy dark:text-white">About this event</h2>
          <p className="leading-7 text-gray-700 dark:text-gray-300">{event.description}</p>
          <p className="mt-4 text-xs text-gray-500">Last checked: {event.verifiedAt.slice(0, 10)}. Confirm timing, tickets and access with the organiser before travelling.</p>
          <ListingSource item={event} />
        </section>
        {safeExternalUrl(event.sourceUrl) && <a href={safeExternalUrl(event.sourceUrl)!} target="_blank" rel="noopener noreferrer" className="mb-3 block rounded-full bg-gold px-5 py-3 text-center font-bold text-navy">Check organiser information ↗</a>}
        {safeExternalUrl(event.ticketUrl) && <a href={safeExternalUrl(event.ticketUrl)!} target="_blank" rel="noopener noreferrer" className="mb-3 block rounded-full bg-gold px-5 py-3 text-center font-bold text-navy">Tickets ↗</a>}
        {safeExternalUrl(event.mapsUrl) && <a href={safeExternalUrl(event.mapsUrl)!} target="_blank" rel="noopener noreferrer" className="mb-3 block rounded-full bg-navy px-5 py-3 text-center font-bold text-gold">📍 Directions</a>}
        <Link href="/events" className="block rounded-full border-2 border-navy px-5 py-3 text-center font-semibold text-navy dark:border-white dark:text-white">← Back to What’s On</Link>
      </div>
    </main>
  );
}
