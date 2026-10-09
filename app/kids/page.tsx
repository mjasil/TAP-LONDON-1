import PagedDirectoryClient from '@/components/PagedDirectoryClient';
import { fetchDirectoryPage } from '@/lib/directoryPage';

export const dynamic = 'force-dynamic';

export default async function KidsPage() {
  const initialPage = await fetchDirectoryPage('kids');
  return (
    <section className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-9 max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-gold">Kids & Family</p>
          <h1 className="mt-3 font-heading text-4xl font-bold leading-tight text-navy dark:text-cream sm:text-5xl">Kids & Family</h1>
          <p className="mt-5 text-base leading-7 text-ink/70 dark:text-cream/70 sm:text-lg sm:leading-8"><strong className="font-bold text-navy dark:text-cream">Plan a family day out</strong> with parks, museums and activities around London.</p>
        </div>
        <PagedDirectoryClient section="kids" mode="kids" initialPage={initialPage}
          tabs={['Parks', 'Museums', 'Activities', 'Entertainment']}
          filters={[{ label: 'Free', value: 'free' }, { label: 'Indoor', value: 'indoor' }, { label: 'Outdoor', value: 'outdoor' }]}
          searchPlaceholder="Search kids activities or areas" />
      </div>
    </section>
  );
}
