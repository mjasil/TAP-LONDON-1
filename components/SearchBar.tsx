'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

type Result = {
  id: string;
  name: string;
  category: string;
  area?: string;
  type: string;
  href: string;
  image?: string;
};

const SECTION_CONFIG: { collection: string; type: string; hrefBase: string; label: string; color: string }[] = [
  { collection: 'places',      type: 'place',      hrefBase: '/places',      label: 'Place',      color: '#c9a84c' },
  { collection: 'food',        type: 'food',        hrefBase: '/food',        label: 'Food',        color: '#d4956a' },
  { collection: 'shopping',    type: 'shopping',    hrefBase: '/shopping',    label: 'Shopping',    color: '#9ab8d4' },
  { collection: 'nightlife',   type: 'nightlife',   hrefBase: '/nightlife',   label: 'Nightlife',   color: '#b18ad4' },
  { collection: 'kids',        type: 'kids',        hrefBase: '/kids',        label: 'Kids',        color: '#7ac9a0' },
  { collection: 'muslim',      type: 'muslim',      hrefBase: '/muslim',      label: 'Muslim Guide', color: '#6abf8f' },
  { collection: 'hotels',      type: 'hotels',      hrefBase: '/hotels',      label: 'Hotel',       color: '#d4a574' },
  { collection: 'offers',      type: 'offers',      hrefBase: '/offers',      label: 'Offer',       color: '#e8b020' },
  { collection: 'hiddenGems',  type: 'hidden-gems', hrefBase: '/hidden-gems', label: 'Hidden Gem',  color: '#9d7ad4' },
  { collection: 'trending',    type: 'trending',    hrefBase: '/trending',    label: 'Trending',    color: '#e55a5a' },
  { collection: 'sports',      type: 'sports',      hrefBase: '/sports',      label: 'Sports',      color: '#5ab0e5' },
];

const TYPE_LABEL_MAP: Record<string, string> = Object.fromEntries(SECTION_CONFIG.map(c => [c.type, c.label]));
const TYPE_COLOR_MAP: Record<string, string> = Object.fromEntries(SECTION_CONFIG.map(c => [c.type, c.color]));

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); setOpen(false); setLoading(false); return; }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setOpen(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (!response.ok) throw new Error('Search unavailable');
        const data = await response.json();
        if (!controller.signal.aborted) setResults(data.items.slice(0, 8).map((item: any) => ({
          id: item.id, name: item.name, category: item.category,
          area: item.area, type: item.section, href: item.href,
          image: item.image,
        })));
      } catch {
        if (!controller.signal.aborted) setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (href: string) => {
    setQuery('');
    setOpen(false);
    router.push(href);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%', maxWidth: '580px', margin: '0 auto' }}>
      <form onSubmit={handleSubmit}>
        <div style={{
          display: 'flex', alignItems: 'center',
          background: focused ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.09)',
          border: focused ? '1px solid rgba(201,168,76,0.55)' : '1px solid rgba(255,255,255,0.15)',
          borderRadius: '50px', overflow: 'hidden',
          backdropFilter: 'blur(16px)',
          transition: 'all 0.25s ease',
          boxShadow: focused ? '0 0 0 3px rgba(201,168,76,0.12)' : 'none',
        }}>
          <div style={{ padding: '0 0 0 20px', color: focused ? '#c9a84c' : 'rgba(255,255,255,0.35)', flexShrink: 0, transition: 'color 0.2s', display: 'flex', alignItems: 'center' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            placeholder="Search places, food, hotels, offers..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              padding: '15px 14px', fontFamily: "'DM Sans', sans-serif",
              fontSize: '0.92rem', color: '#ffffff',
            }}
          />

          {query && (
            <button type="button" onClick={() => { setQuery(''); setOpen(false); inputRef.current?.focus(); }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: '0 8px', fontSize: '1rem', display: 'flex', alignItems: 'center' }}>
              ✕
            </button>
          )}

          <button type="submit" style={{
            background: 'linear-gradient(135deg, #c9a84c, #f0d07a)', color: '#1a1a2e',
            border: 'none', borderRadius: '40px', padding: '10px 22px',
            fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '0.8rem',
            cursor: 'pointer', margin: '5px 5px 5px 0', whiteSpace: 'nowrap' as const,
            flexShrink: 0,
          }}>
            Search
          </button>
        </div>
      </form>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{
              position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 100,
              background: 'rgba(18,18,36,0.97)', backdropFilter: 'blur(20px)',
              border: '1px solid rgba(201,168,76,0.2)', borderRadius: '16px',
              overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              maxHeight: '420px', overflowY: 'auto' as const,
            }}
          >
            {loading && (
              <div style={{ padding: '16px', textAlign: 'center' as const, fontFamily: "'DM Sans', sans-serif", fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                Searching...
              </div>
            )}
            {!loading && results.map((r, i) => (
              <motion.button
                key={r.type + r.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => handleSelect(r.href)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 16px', background: 'none', border: 'none',
                  borderBottom: i < results.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  cursor: 'pointer', textAlign: 'left' as const,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,168,76,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                {r.image ? (
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                    <img src={r.image} alt={r.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : (
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(201,168,76,0.1)', flexShrink: 0 }} />
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.88rem', fontWeight: 600, color: '#ffffff', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.name}
                  </div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', marginTop: '1px' }}>
                    {r.category}{r.area ? ' · ' + r.area : ''}
                  </div>
                </div>

                <div style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: '0.6rem', fontWeight: 700,
                  letterSpacing: '0.8px', textTransform: 'uppercase' as const,
                  color: TYPE_COLOR_MAP[r.type] || '#c9a84c', background: `${TYPE_COLOR_MAP[r.type] || '#c9a84c'}18`,
                  padding: '3px 8px', borderRadius: '20px', flexShrink: 0,
                  border: `1px solid ${TYPE_COLOR_MAP[r.type] || '#c9a84c'}30`,
                }}>
                  {TYPE_LABEL_MAP[r.type] || r.type}
                </div>

                <div style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </div>
              </motion.button>
            ))}

            {!loading && results.length === 0 && query.length >= 2 && (
              <div style={{ padding: '20px 16px', textAlign: 'center' as const, fontFamily: "'DM Sans', sans-serif", fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)' }}>
                No results for "{query}"
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
