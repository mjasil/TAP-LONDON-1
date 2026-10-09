'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PlaceCard, { type CardItem } from './PlaceCard';
import { readSavedPlaces, toggleSavedPlace } from '@/lib/savedPlaces';
import type { DirectoryPage } from '@/lib/directoryPage';

type Props = {
  section: 'places' | 'food' | 'nightlife' | 'kids' | 'hotels' | 'shopping';
  mode: 'place' | 'food' | 'nightlife' | 'kids' | 'hotels' | 'shopping';
  tabs: string[];
  searchPlaceholder: string;
  initialPage: DirectoryPage;
  filters?: { label: string; value: string }[];
};

async function loadPage(section: string, category: string, search: string, filter: string, cursor = '', signal?: AbortSignal): Promise<DirectoryPage> {
  const params = new URLSearchParams();
  if (category !== 'All') params.set('category', category);
  if (search.trim().length >= 2) params.set('q', search.trim());
  if (filter) params.set('filter', filter);
  if (cursor) params.set('cursor', cursor);
  const response = await fetch(`/api/directory/${section}?${params}`, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error('Could not load listings');
  return response.json();
}

export default function PagedDirectoryClient({ section, mode, tabs, searchPlaceholder, initialPage, filters = [] }: Props) {
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [moreLoading, setMoreLoading] = useState(false);
  const [error, setError] = useState(false);
  const [savedKeys, setSavedKeys] = useState<string[]>([]);

  useEffect(() => {
    const refresh = () => setSavedKeys(readSavedPlaces().map(item => item.key));
    refresh();
    const search = new URLSearchParams(window.location.search).get('search');
    if (search) setQuery(search.slice(0, 80));
    window.addEventListener('tap-saved-places', refresh);
    return () => window.removeEventListener('tap-saved-places', refresh);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (category === 'All' && !debouncedQuery && !filter) {
      setPage(initialPage);
      setError(false);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    loadPage(section, category, debouncedQuery, filter, '', controller.signal)
      .then(result => setPage(result))
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [section, category, debouncedQuery, filter, initialPage]);

  async function showMore() {
    if (!page.nextCursor || moreLoading) return;
    setMoreLoading(true);
    setError(false);
    try {
      const result = await loadPage(section, category, debouncedQuery, filter, page.nextCursor);
      setPage(previous => ({ ...result, items: [...previous.items, ...result.items] }));
    } catch {
      setError(true);
    } finally {
      setMoreLoading(false);
    }
  }

  const activeSearch = debouncedQuery.trim().length >= 2;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <input
          type="search" value={query} onChange={event => setQuery(event.target.value)}
          placeholder={searchPlaceholder} aria-label={searchPlaceholder}
          className="min-h-12 w-full rounded-full border border-navy/15 bg-navy/5 px-5 text-sm text-navy outline-none focus:border-gold dark:border-cream/20 dark:bg-white/10 dark:text-cream"
        />
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Categories">
          {['All', ...tabs.filter(tab => tab !== 'All')].map(tab => (
            <button key={tab} type="button" onClick={() => setCategory(tab)}
              aria-pressed={category === tab}
              className={`min-h-12 shrink-0 rounded-full px-5 text-sm font-bold transition ${category === tab
                ? 'bg-navy text-white dark:bg-gold dark:text-navy'
                : 'bg-white text-navy hover:bg-gold/20 dark:bg-white/10 dark:text-cream'}`}
            >{tab}</button>
          ))}
        </div>
      </div>

      {filters.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Quick filters">
          {filters.map(option => (
            <button key={option.value} type="button" onClick={() => setFilter(filter === option.value ? '' : option.value)}
              aria-pressed={filter === option.value}
              className={`min-h-11 shrink-0 rounded-full px-4 text-xs font-bold ${filter === option.value
                ? 'bg-gold text-navy' : 'bg-navy/5 text-navy/70 dark:bg-white/10 dark:text-cream/70'}`}
            >{option.label}</button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-navy/10 pb-4 dark:border-cream/15" aria-live="polite">
        <div className="flex items-baseline gap-3">
          <strong className="font-heading text-3xl leading-none text-navy dark:text-cream sm:text-4xl">{page.total.toLocaleString()}</strong>
          <span className="text-sm font-bold text-ink/65 dark:text-cream/70">{page.total === 1 ? 'result' : 'results'}</span>
        </div>
        <Link href="/saved" className="inline-flex min-h-11 items-center text-sm font-bold text-gold">View saved places ({savedKeys.length}) →</Link>
      </div>

      {query.trim().length === 1 && <p className="text-sm text-ink/60 dark:text-cream/60">Type one more letter to search.</p>}
      {error && <p role="alert" className="text-sm text-red-700">Listings could not be loaded. Try the category or search again.</p>}
      {loading ? <p className="py-12 text-center text-sm text-ink/60 dark:text-cream/60">Loading results…</p> : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {page.items.map(item => (
              <div key={item.id} className="relative flex flex-col">
                <PlaceCard item={item as CardItem} mode={mode as any} />
                <div className="flex items-center justify-between gap-3 px-2 py-2 text-xs font-semibold">
                  <button type="button" onClick={() => toggleSavedPlace({
                    key: `${mode}:${item.id}`, name: item.name, area: item.area,
                    href: `/${section}/${encodeURIComponent(item.id)}`,
                  })} className="min-h-11 text-gold" aria-label={`${savedKeys.includes(`${mode}:${item.id}`) ? 'Remove' : 'Save'} ${item.name}`}>
                    {savedKeys.includes(`${mode}:${item.id}`) ? '♥ Saved' : '♡ Save place'}
                  </button>
                  <a href={`mailto:taplondonofficial@gmail.com?subject=${encodeURIComponent(`Listing correction: ${item.name}`)}&body=${encodeURIComponent(`Please check ${item.name} (${section}/${item.id}). Correction: `)}`}
                    className="text-ink/50 dark:text-cream/60">Report wrong info</a>
                </div>
              </div>
            ))}
          </div>
          {page.items.length === 0 && <p className="py-12 text-center text-sm text-ink/60 dark:text-cream/60">No results match this search. Try another name or area.</p>}
          {page.nextCursor && (
            <div className="flex flex-col items-center gap-2 py-4">
              <p className="text-sm text-ink/60 dark:text-cream/60">Showing {page.items.length.toLocaleString()} of {page.total.toLocaleString()} places</p>
              <button type="button" disabled={moreLoading} onClick={showMore}
                className="min-h-12 rounded-full bg-navy px-7 text-sm font-bold text-white disabled:opacity-50 dark:bg-gold dark:text-navy">
                {moreLoading ? 'Loading…' : 'Show more results'}
              </button>
            </div>
          )}
          {activeSearch && page.total > 0 && <p className="text-xs text-ink/50 dark:text-cream/55">Search matches the beginning of a venue name, area, or category word.</p>}
        </>
      )}
    </div>
  );
}
