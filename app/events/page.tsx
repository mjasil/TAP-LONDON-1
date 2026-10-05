import { fetchCollection } from '@/lib/firestore';
import EventsPageClient from './EventsPageClient';

export const dynamic = 'force-dynamic';

export default async function EventsPage() {
  const items = await fetchCollection('events');
  return <EventsPageClient initialItems={items || []} />;
}
