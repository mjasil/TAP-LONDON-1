'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

type Item = { id: string; name: string; category: string; area: string; description: string; image: string; href: string; section: string };
type Page = { items: Item[]; total: number; nextCursor: string | null };
const EMPTY: Page = { items: [], total: 0, nextCursor: null };

async function getPage(q: string, cursor = '', signal?: AbortSignal): Promise<Page> {
  const params = new URLSearchParams({ q });
  if (cursor) params.set('cursor', cursor);
  const response = await fetch(`/api/search?${params}`, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error('Search failed');
  return response.json();
}

function Results() {
  const router = useRouter();
  const q = (useSearchParams().get('q') || '').trim().slice(0, 60);
  const [draft, setDraft] = useState(q);
  const [page, setPage] = useState<Page>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [moreLoading, setMoreLoading] = useState(false);
  const [error, setError] = useState(false);
  const generation = useRef(0);

  useEffect(() => {
    setDraft(q);
    const current = ++generation.current;
    if (q.length < 2) { setPage(EMPTY); setLoading(false); setError(false); return; }
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    getPage(q, '', controller.signal)
      .then(result => { if (generation.current === current) setPage(result); })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (generation.current === current) setLoading(false); });
    return () => controller.abort();
  }, [q]);

  async function showMore() {
    if (!page.nextCursor || moreLoading) return;
    const current = generation.current;
    setMoreLoading(true);
    setError(false);
    try {
      const next = await getPage(q, page.nextCursor);
      if (generation.current === current) setPage(previous => ({ ...next, items: [...previous.items, ...next.items] }));
    } catch {
      if (generation.current === current) setError(true);
    } finally {
      setMoreLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f9f7f2] dark:bg-[#0d0d1a]">
      <div className="bg-navy px-5 py-12 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Search</p>
          <h1 className="mt-3 font-heading text-3xl font-bold sm:text-5xl">Explore London</h1>
          <form onSubmit={event => {
            event.preventDefault();
            router.push(draft.trim().length >= 2 ? `/search?q=${encodeURIComponent(draft.trim())}` : '/search');
          }} className="mt-6 flex max-w-2xl gap-2">
            <input type="search" value={draft} onChange={event => setDraft(event.target.value)}
              aria-label="Search TAP London" placeholder="Search places, food, pubs or areas"
              className="min-h-12 min-w-0 flex-1 rounded-full bg-white px-5 text-sm text-navy outline-none focus:ring-2 focus:ring-gold" />
            <button className="min-h-12 rounded-full bg-gold px-6 text-sm font-bold text-navy">Search</button>
          </form>
          {q.length >= 2 && !loading && !error && <p className="mt-4 text-sm text-white/75" aria-live="polite">
            {page.total.toLocaleString()} {page.total === 1 ? 'result' : 'results'} for “{q}”
          </p>}
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-5 py-10">
        {q.length < 2 && <div>
          <p className="text-sm text-ink/70 dark:text-cream/70">Search by venue name or area, or browse a section.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {['places', 'food', 'kids', 'nightlife', 'shopping', 'hotels'].map(section =>
              <Link key={section} href={`/${section}`} className="rounded-full bg-white px-5 py-3 text-sm font-bold capitalize text-navy shadow-sm dark:bg-navy dark:text-cream">{section}</Link>)}
          </div>
        </div>}
        {loading && <p role="status" className="py-12 text-center text-sm text-ink/70 dark:text-cream/70">Finding London listings…</p>}
        {error && <p role="alert" className="py-6 text-sm text-red-700">Search could not be loaded. Please try again.</p>}
        {!loading && q.length >= 2 && !error && <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {page.items.map((item, index) => <Link key={`${item.section}:${item.id}:${index}`} href={item.href}
              className="overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-cream/10 dark:bg-navy">
              {item.image ? <img src={item.image} alt={item.name} loading="lazy" decoding="async" className="h-44 w-full object-cover" />
                : <div className="flex h-44 items-center justify-center bg-navy/10 text-3xl" aria-hidden="true">📍</div>}
              <div className="p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-gold">{item.section.replace('-', ' ')} · {item.category}</p>
                <h2 className="mt-2 font-heading text-xl font-bold text-navy dark:text-cream">{item.name}</h2>
                {item.area && <p className="mt-2 text-sm font-semibold text-ink/65 dark:text-cream/70">📍 {item.area}</p>}
                {item.description && <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink/70 dark:text-cream/70">{item.description}</p>}
              </div>
            </Link>)}
          </div>
          {page.items.length === 0 && <p className="py-12 text-center text-sm text-ink/65 dark:text-cream/65">No matches yet. Try a venue name, area or another keyword.</p>}
          {page.nextCursor && <div className="mt-10 text-center">
            <p className="mb-3 text-sm text-ink/65 dark:text-cream/65">Showing {page.items.length.toLocaleString()} of {page.total.toLocaleString()}</p>
            <button type="button" onClick={showMore} disabled={moreLoading}
              className="min-h-12 rounded-full bg-navy px-7 text-sm font-bold text-white disabled:opacity-50 dark:bg-gold dark:text-navy">
              {moreLoading ? 'Loading…' : 'Show more results'}
            </button>
          </div>}
        </>}
      </div>
    </main>
  );
}

export default function SearchPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#f9f7f2] p-8 dark:bg-[#0d0d1a]">Loading search…</main>}><Results /></Suspense>;
}
