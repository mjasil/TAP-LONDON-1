'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchDocument } from '@/lib/firestore';
import { verifiedOffer } from '@/lib/verifiedOffer';
import { safeExternalUrl } from '@/lib/nightlifeListing';
import PhotoCredit from '@/components/PhotoCredit';

export default function OfferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchDocument('offers', id).then(item => {
      if (active) { setOffer(verifiedOffer(item)); setLoading(false); }
    }).catch(() => {
      if (active) { setOffer(null); setLoading(false); }
    });
    return () => { active = false; };
  }, [id]);

  if (loading) return <main className="min-h-screen bg-cream px-5 py-24 text-center dark:bg-[#0d0d1a]">Loading offer...</main>;
  if (!offer) return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream px-5 text-center dark:bg-[#0d0d1a]">
      <h1 className="font-heading text-3xl font-bold text-navy dark:text-cream">Offer unavailable</h1>
      <p className="text-ink/70 dark:text-cream/70">This offer may have expired or is not approved for publication.</p>
      <Link href="/offers" className="font-bold text-gold">← Back to Offers</Link>
    </main>
  );

  const isPartner = offer.offerType === 'Confirmed TAP partner offer';
  const venueSection = ['places', 'food', 'nightlife', 'hotels', 'kids', 'shopping'].includes(offer.venueSection) ? offer.venueSection : null;

  return (
    <main className="min-h-screen bg-cream pb-16 dark:bg-[#0d0d1a]">
      <div className="relative mx-auto h-[38vh] min-h-[260px] max-h-[460px] max-w-[1400px] overflow-hidden bg-navy">
        {offer.image && offer.imageRightsConfirmed === true && <img src={offer.image} alt={offer.name} className="h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-navy/95 to-transparent" />
        <Link href="/offers" className="absolute left-4 top-4 rounded-full border border-white/30 bg-navy/50 px-4 py-2 text-sm font-semibold text-white">← Back</Link>
        <div className="absolute bottom-0 p-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gold">{offer.offerType}</p>
          <h1 className="font-heading text-3xl font-bold text-white sm:text-5xl">{offer.name}</h1>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 pt-5">
        {offer.imageRightsConfirmed === true && <PhotoCredit item={offer} />}
        <section className="mb-5 rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1a1a2e]">
          <p className="mb-3 text-lg font-bold text-gold">{offer.discount}</p>
          <p className="leading-7 text-gray-700 dark:text-gray-300">{offer.description}</p>
          {offer.area && <p className="mt-3 text-sm text-gray-500">📍 {offer.area}</p>}
          {isPartner && <>
            <h2 className="mt-5 font-heading text-2xl font-bold text-navy dark:text-white">Terms and redemption</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-gray-700 dark:text-gray-300">{offer.terms}</p>
            {offer.validFrom && <p className="mt-2 text-sm text-gray-500">Starts {offer.validFrom}</p>}
            <p className="mt-1 text-sm text-gray-500">Expires {offer.validUntil}</p>
            {offer.redemptionInstructions && <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">{offer.redemptionInstructions}</p>}
            {offer.code && <p className="mt-3 rounded-lg bg-gold/10 px-4 py-3 text-sm font-bold text-navy dark:text-cream">Offer code: {offer.code}</p>}
          </>}
          <p className="mt-5 text-xs text-gray-500">Check the current terms with the issuer or venue before booking or visiting.</p>
        </section>
        {venueSection && offer.venueId && <Link href={`/${venueSection}/${encodeURIComponent(offer.venueId)}`} className="mb-3 block rounded-full border-2 border-navy px-5 py-3 text-center font-bold text-navy dark:border-cream dark:text-cream">View venue details →</Link>}
        <a href={safeExternalUrl(offer.sourceUrl)!} target="_blank" rel="noopener noreferrer" className="mb-3 block rounded-full bg-gold px-5 py-3 text-center font-bold text-navy">Check official terms ↗</a>
        <Link href="/offers" className="block rounded-full border-2 border-navy px-5 py-3 text-center font-bold text-navy dark:border-cream dark:text-cream">← Back to Offers</Link>
      </div>
    </main>
  );
}
