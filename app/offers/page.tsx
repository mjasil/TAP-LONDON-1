import { fetchCollection } from '@/lib/firestore';
import OffersPageClient from './OffersPageClient';

export const dynamic = 'force-dynamic';

export default async function OffersPage() {
  const items = await fetchCollection('offers');
  return <OffersPageClient initialItems={items || []} />;
}
