import { fetchCollection } from '@/lib/firestore';
import FoodPageClient from './FoodPageClient';

export const dynamic = 'force-dynamic';

export default async function FoodPage() {
  const items = await fetchCollection('food');
  return <FoodPageClient initialItems={items || []} />;
}
