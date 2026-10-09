import PagedDirectoryClient from '@/components/PagedDirectoryClient';
import { fetchDirectoryPage } from '@/lib/directoryPage';

export const dynamic = 'force-dynamic';

export default async function NightlifePage() {
  const initialPage = await fetchDirectoryPage('nightlife');
  const latePicks = initialPage.items.filter(item => item.openLate === true).slice(0, 4);
  return (
    <section className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-9 max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-gold">Nightlife</p>
          <h1 className="mt-3 font-heading text-4xl font-bold leading-tight text-navy dark:text-cream sm:text-5xl">London Nightlife</h1>
          <p className="mt-5 text-base leading-7 text-ink/70 dark:text-cream/70 sm:text-lg sm:leading-8"><strong className="font-bold text-navy dark:text-cream">Explore London after dark</strong> with bars, pubs, clubs and live music. {initialPage.total.toLocaleString()} places to browse.</p>
        </div>
        {latePicks.length > 0 && (
          <div className="mb-8 rounded-[20px] border border-gold/25 bg-navy p-6 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#7ac9a0]">Late-night venues — check opening hours</p>
            <h2 className="mt-2 font-heading text-2xl font-bold">London after dark 🌙</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {latePicks.map(item => <a key={item.id} href={`/nightlife/${item.id}`} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm font-bold hover:border-gold">{item.name}</a>)}
            </div>
          </div>
        )}
        <PagedDirectoryClient section="nightlife" mode="nightlife" initialPage={initialPage}
          tabs={['Pubs', 'Bars', 'Clubs', 'Live Music', 'Rooftop Bars']}
          filters={[{ label: 'Rooftop', value: 'rooftop' }, { label: 'Open Late', value: 'open-late' }]}
          searchPlaceholder="Search nightlife venues or areas" />
        <p className="mt-10 text-xs leading-6 text-ink/60 dark:text-cream/60">
          Some listing names and locations use <a href="https://www.wikidata.org/wiki/Wikidata:Licensing" className="underline">Wikidata</a> and <a href="https://www.openstreetmap.org/copyright" className="underline">OpenStreetMap contributors</a>. Check current details with each venue.
        </p>
      </div>
    </section>
  );
}
