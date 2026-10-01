"use client";

import { useEffect, useMemo, useState } from "react";
import Link from 'next/link';
import PlaceCard, { type CardItem } from "./PlaceCard";
import { readSavedPlaces, toggleSavedPlace } from '@/lib/savedPlaces';
import { availableCategories, MIN_FILTER_RESULTS } from "@/lib/filterAvailability";
import { isOpenAt } from "@/lib/openingHours";

type DirectoryClientProps = {
  items: CardItem[];
  tabs: string[];
  mode?: "place" | "food" | "shopping" | "kids" | "nightlife" | "hotels" | "offers" | "hidden-gems" | "trending" | "sports" | "muslim" | "emergency";
  searchPlaceholder?: string;
  showSearch?: boolean;
};

// Universal smart filters — work across all sections by inspecting common fields
type SmartFilter = {
  label: string;
  value: string;
  test: (item: any) => boolean;
};

function isOpenNow(item: any): boolean {
  return isOpenAt(item.openingHours);
}

function isOpenLate(item: any): boolean {
  if (item.openLate === true) return true;
  const hours = (item.openingHours || "").toLowerCase();
  return /2[2-3]:00|midnight|late|24 hour/.test(hours);
}

function getSmartFilters(mode: string): SmartFilter[] {
  const common: SmartFilter[] = [
    { label: "Open Now", value: "open-now", test: isOpenNow },
    { label: "Open Late", value: "open-late", test: isOpenLate },
    { label: "Free", value: "free", test: (i) => {
      // Don't trust priceType alone or a loose "free" text match - an entryFee
      // like "Exterior free; guided tours from \u00a328" contains the word "free"
      // but the place is NOT free overall. Only count it as free if priceType
      // says so AND there's no real price mentioned in the fee text.
      const feeText = (i.entryFee || "").toLowerCase();
      const hasRealPrice = /\u00a3\s?\d/.test(feeText);
      if (hasRealPrice) return false;
      return i.priceType === "Free" || /\bfree\b/i.test(feeText);
    } },
    { label: "Near Station", value: "near-station", test: (i) => !!i.nearestStation },
  ];

  const byMode: Record<string, SmartFilter[]> = {
    food: [
      { label: "Halal", value: "halal", test: (i) => !!i.halal || !!i.verifiedHalal || (i.tags || []).includes("halal") },
      { label: "Cheap Eats", value: "cheap", test: (i) => i.priceRange === "£" || (i.tags || []).includes("cheap-eats") },
      { label: "Date Night", value: "date-night", test: (i) => i.vibe === "Date night" || (i.tags || []).includes("date-night") },
      { label: "Family", value: "family", test: (i) => i.vibe === "Family" || (i.tags || []).includes("family") },
      { label: "Viral", value: "viral", test: (i) => (i.tags || []).includes("viral") },
      { label: "Hidden Gem", value: "hidden-gem", test: (i) => i.vibe === "Hidden gem" || (i.tags || []).includes("hidden-gem") },
    ],
    muslim: [
      { label: "Halal", value: "halal", test: (i) => !!i.halal || !!i.verifiedHalal },
    ],
    kids: [
      { label: "Free", value: "free", test: (i) => {
      // Don't trust priceType alone or a loose "free" text match - an entryFee
      // like "Exterior free; guided tours from \u00a328" contains the word "free"
      // but the place is NOT free overall. Only count it as free if priceType
      // says so AND there's no real price mentioned in the fee text.
      const feeText = (i.entryFee || "").toLowerCase();
      const hasRealPrice = /\u00a3\s?\d/.test(feeText);
      if (hasRealPrice) return false;
      return i.priceType === "Free" || /\bfree\b/i.test(feeText);
    } },
      { label: "Indoor", value: "indoor", test: (i) => /museum|indoor|aquarium/i.test(i.category || "") },
      { label: "Outdoor", value: "outdoor", test: (i) => /park|zoo|garden|outdoor/i.test(i.category || "") },
    ],
    hotels: [
      { label: "Family Friendly", value: "family", test: (i) => i.familyFriendly === true || i.familyFriendly === "true" },
      { label: "Has Pool", value: "pool", test: (i) => (i.amenities || []).some((a: string) => /pool/i.test(a)) },
      { label: "Has Spa", value: "spa", test: (i) => (i.amenities || []).some((a: string) => /spa/i.test(a)) },
      { label: "Budget", value: "budget", test: (i) => i.category === "Budget" },
      { label: "Luxury", value: "luxury", test: (i) => i.category === "5-star" || i.category === "Luxury" },
    ],
    nightlife: [
      { label: "Rooftop", value: "rooftop", test: (i) => /rooftop/i.test(i.category || "") },
      { label: "Free Entry", value: "free-entry", test: (i) => /free/i.test(i.entryFee || "") },
      { label: "Open Late", value: "open-late", test: isOpenLate },
    ],
    place: [
      { label: "Free", value: "free", test: (i) => i.priceType === "Free" },
      { label: "Special Offer", value: "offer", test: (i) => !!i.offerTag || !!i.offer },
    ],
  };

  return [...(byMode[mode] || []), ...common].filter(
    (f, i, arr) => arr.findIndex(x => x.value === f.value) === i
  );
}

export default function DirectoryClient({
  items, tabs, mode = "place", searchPlaceholder = "Search...", showSearch = true
}: DirectoryClientProps) {
  const [active, setActive] = useState(tabs[0] ?? "All");
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [savedKeys, setSavedKeys] = useState<string[]>([]);

  useEffect(() => {
    const refresh = () => setSavedKeys(readSavedPlaces().map(p => p.key));
    refresh();
    const search = new URLSearchParams(window.location.search).get('search');
    if (search) setQuery(search.slice(0, 100));
    window.addEventListener('tap-saved-places', refresh);
    return () => window.removeEventListener('tap-saved-places', refresh);
  }, []);

  // Emergency information must remain easy to browse without speculative hours filters.
  const smartFilters = useMemo(() => mode === 'emergency' ? [] : getSmartFilters(mode), [mode]);
  const availableTabs = useMemo(() => {
    if (mode === 'emergency') return tabs;
    const eligible = availableCategories(items, tabs, (item: any, category) =>
      (item.category ?? item.section ?? item.sport) === category
    );
    return tabs.includes('All') ? eligible : ['All', ...eligible];
  }, [items, tabs, mode]);
  const selectedTab = availableTabs.includes(active) ? active : availableTabs[0];

  const queryMatches = (item: any) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    const text = [
      item.name, item.category, item.section, item.area,
      item.location, item.cuisine, item.type, item.description,
      item.vibe, item.opinion, item.mustTry, item.nearestStation,
    ].filter(Boolean).join(' ').toLowerCase();
    return text.includes(needle);
  };

  const baseItems = items.filter((item: any) =>
    (selectedTab === 'All' || (item.category ?? item.section ?? item.sport) === selectedTab)
    && queryMatches(item)
  );

  const availableFilters = smartFilters.filter(filter => {
    const otherFilters = activeFilters.filter(value => value !== filter.value);
    const matches = baseItems.filter(item =>
      otherFilters.every(value => smartFilters.find(f => f.value === value)?.test(item) ?? true)
      && filter.test(item)
    ).length;
    return activeFilters.includes(filter.value) || matches >= MIN_FILTER_RESULTS;
  });

  function toggleFilter(value: string) {
    setActiveFilters(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  }

  const filtered = useMemo(() => {
    return baseItems.filter(item => activeFilters.every(value =>
      smartFilters.find(filter => filter.value === value)?.test(item) ?? true
    ));
  }, [baseItems, activeFilters, smartFilters]);

  return (
    <div className="space-y-6">
      {/* Search + Tabs */}
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        {showSearch ? (
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            style={{
              width: "100%", boxSizing: "border-box" as const,
              background: "rgba(26,26,46,0.06)",
              border: "1px solid rgba(26,26,46,0.12)",
              borderRadius: "50px", padding: "12px 20px",
              fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem",
              color: "#1a1a2e", outline: "none",
            }}
          />
        ) : (
          <div />
        )}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {availableTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => { setActive(tab); setActiveFilters([]); }}
              className={`min-h-12 shrink-0 rounded-full px-5 text-sm font-bold transition ${
                selectedTab === tab
                  ? "bg-navy text-white shadow-premium dark:bg-gold dark:text-navy"
                  : "bg-white text-navy hover:bg-gold/20 dark:bg-white/10 dark:text-cream dark:hover:bg-gold/20"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Smart filter chips — works for every section */}
      {availableFilters.length > 0 && (
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
          {availableFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => toggleFilter(f.value)}
              style={{
                flexShrink: 0, borderRadius: "50px", padding: "6px 14px",
                fontSize: "0.75rem", fontWeight: 700,
                fontFamily: "'DM Sans', sans-serif", cursor: "pointer",
                border: "none", transition: "all 0.2s",
                background: activeFilters.includes(f.value) ? "#c9a84c" : "rgba(26,26,46,0.06)",
                color: activeFilters.includes(f.value) ? "#1a1a2e" : "#555",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      <p className="text-sm font-semibold text-ink/62 dark:text-cream/60">
        {filtered.length} results
        {activeFilters.length > 0 && (
          <button
            onClick={() => setActiveFilters([])}
            style={{ marginLeft: "8px", color: "#c9a84c", fontSize: "0.75rem", fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}
          >
            ✕ Clear {activeFilters.length} filter{activeFilters.length > 1 ? 's' : ''}
          </button>
        )}
      </p>
      <Link href="/saved" className="text-sm font-semibold text-gold">View saved places ({savedKeys.length}) →</Link>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((item) => (
          <div key={item.id} className="relative flex flex-col">
            <PlaceCard item={item} mode={mode as any} />
            <div className="flex items-center justify-between gap-3 px-2 py-2 text-xs font-semibold">
              <button type="button" onClick={() => {
                const section = mode === 'place' ? 'places' : mode;
                const hasDetail = ['places', 'food', 'shopping', 'kids', 'nightlife', 'muslim'].includes(section);
                const href = hasDetail ? `/${section}/${encodeURIComponent(item.id)}` : `/${section}?search=${encodeURIComponent(item.name)}`;
                toggleSavedPlace({ key: `${mode}:${item.id}`, name: item.name, area: item.area, href });
              }} className="text-gold" aria-label={`${savedKeys.includes(`${mode}:${item.id}`) ? 'Remove' : 'Save'} ${item.name}`}>
                {savedKeys.includes(`${mode}:${item.id}`) ? '♥ Saved' : '♡ Save place'}
              </button>
              <a href={`mailto:taplondonofficial@gmail.com?subject=${encodeURIComponent(`Listing correction: ${item.name}`)}&body=${encodeURIComponent(`Please check this listing: ${item.name}\nSection: ${mode}\nListing ID: ${item.id}\nCorrection: `)}`} className="text-ink/50 dark:text-cream/60">Report wrong info</a>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'rgba(26,26,46,0.4)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🔍</div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.9rem' }}>No results match your filters. Try clearing some.</p>
        </div>
      )}
    </div>
  );
}
