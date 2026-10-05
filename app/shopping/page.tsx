import { fetchCollection } from '@/lib/firestore';
import ShoppingPageClient from './ShoppingPageClient';

export const dynamic = 'force-dynamic';

export default async function ShoppingPage() {
  const items = await fetchCollection('shopping');
  return <ShoppingPageClient initialItems={items || []} />;
}
