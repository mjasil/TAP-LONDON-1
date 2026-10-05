import { fetchCollection } from '@/lib/firestore';
import EmergencyPageClient from './EmergencyPageClient';

export const dynamic = 'force-dynamic';

export default async function EmergencyPage() {
  const items = await fetchCollection('emergency');
  return <EmergencyPageClient initialItems={items || []} />;
}
