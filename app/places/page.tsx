import type { Metadata } from 'next';
import PlacesPageClient from './PlacesPageClient';
import { fetchDirectoryPage } from '@/lib/directoryPage';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Best Places to Visit in London — Attractions, Hidden Gems & Photo Spots',
  description: 'Discover the best places in London: top attractions, hidden gems, iconic photo spots and free things to do. Curated by TAP LONDON.',
  alternates: { canonical: '/places' },
  openGraph: {
    title: 'Best Places to Visit in London | TAP LONDON',
    description: 'Top attractions, hidden gems, iconic photo spots and free things to do in London.',
    url: '/places',
    type: 'website',
  },
};

export default async function PlacesPage() {
  const initialPage = await fetchDirectoryPage('places');
  return <PlacesPageClient initialPage={initialPage} />;
}
