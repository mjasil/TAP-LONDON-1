import PagedDirectoryClient from '@/components/PagedDirectoryClient';
import type { DirectoryPage } from '@/lib/directoryPage';

export default function PlacesPageClient({ initialPage }: { initialPage: DirectoryPage }) {
  return (
    <section className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-9 max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-gold">Places</p>
          <h1 className="mt-3 font-heading text-4xl font-bold leading-tight text-navy dark:text-cream sm:text-5xl">Best Places in London</h1>
          <p className="mt-5 text-base leading-7 text-ink/70 dark:text-cream/70 sm:text-lg sm:leading-8"><strong className="font-bold text-navy dark:text-cream">Explore the city</strong> through attractions, museums, parks and local landmarks.</p>
        </div>
        <PagedDirectoryClient section="places" mode="place" initialPage={initialPage}
          tabs={['Top Attractions', 'Hidden Gems', 'Photo Spots', 'Free Things']}
          filters={[{ label: 'Free', value: 'free' }]}
          searchPlaceholder="Search places, areas, or attractions" />
      </div>
    </section>
  );
}
