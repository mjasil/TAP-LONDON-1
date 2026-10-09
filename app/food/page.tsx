import { fetchDirectoryPage } from '@/lib/directoryPage';
import FoodPageClient from './FoodPageClient';

export const dynamic = 'force-dynamic';

export default async function FoodPage() {
  const initialPage = await fetchDirectoryPage('food');
  return <FoodPageClient initialPage={initialPage} />;
}
