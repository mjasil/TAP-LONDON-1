import PagedDirectoryClient from '@/components/PagedDirectoryClient';
import type { DirectoryPage } from '@/lib/directoryPage';

export default function FoodPageClient({ initialPage }: { initialPage: DirectoryPage }) {
  return (
    <section className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-9 max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-gold">Food & Drinks</p>
          <h1 className="mt-3 font-heading text-4xl font-bold leading-tight text-navy dark:text-cream sm:text-5xl">Where to Eat in London</h1>
          <p className="mt-5 text-base leading-7 text-ink/70 dark:text-cream/70 sm:text-lg sm:leading-8"><strong className="font-bold text-navy dark:text-cream">Find your next meal</strong> across restaurants, halal food, speciality coffee, and local food spots.</p>
        </div>
        <PagedDirectoryClient section="food" mode="food" initialPage={initialPage}
          tabs={['Restaurants', 'Halal Food', 'Coffee Shops', 'Local Spots']}
          filters={[{ label: 'Halal', value: 'halal' }, { label: 'Cheap Eats', value: 'cheap' }]}
          searchPlaceholder="Search food, cuisine, or area" />
      </div>
    </section>
  );
}
