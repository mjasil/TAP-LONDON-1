import { fetchCollection } from '@/lib/firestore';
import HotelsPageClient from './HotelsPageClient';

export const dynamic = 'force-dynamic';

export default async function HotelsPage() {
  const items = await fetchCollection('hotels');
  return <HotelsPageClient initialItems={items || []} />;
}
