'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchCollection } from '@/lib/firestore';
import { addCalendarDays, londonToday } from '@/lib/eventDates';
import { openingStatusAt } from '@/lib/openingHours';

const INTEREST_OPTIONS = [
  { key: 'football', label: 'Football', icon: '⚽', collections: ['sports'] },
  { key: 'history', label: 'History', icon: '🏛️', collections: ['places'] },
  { key: 'food', label: 'Food', icon: '🍽️', collections: ['food'] },
  { key: 'nightlife', label: 'Nightlife', icon: '🌙', collections: ['nightlife'] },
  { key: 'shopping', label: 'Shopping', icon: '🛍️', collections: ['shopping'] },
  { key: 'hidden-gems', label: 'Hidden Gems', icon: '💎', collections: ['hiddenGems'] },
  { key: 'theatre', label: 'Theatre', icon: '🎭', collections: ['theatre'] },
  { key: 'music', label: 'Music', icon: '🎵', collections: ['music'] },
  { key: 'family', label: 'Family', icon: '👨‍👩‍👧', collections: ['kids'] },
];

const TRAVEL_WITH = ['Solo', 'Partner', 'Friends', 'Family'];
const HOTEL_AREAS = ['Central London', 'West London', 'North London', 'East London', 'South London', "Doesn't matter"];

type DayPlan = {
  day: number;
  items: { time: string; name: string; area?: string; href: string; slot: string }[];
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const AREA_GROUPS: [string, RegExp][] = [
  ['central', /westminster|soho|covent garden|piccadilly|mayfair|marylebone|fitzrovia|holborn|bloomsbury|strand|trafalgar|charing cross|king'?s cross|st james/i],
  ['river', /london bridge|borough|bankside|south bank|waterloo|tower bridge|tower hill|city of london/i],
  ['east', /shoreditch|bethnal green|whitechapel|hackney|spitalfields|liverpool street|stratford/i],
  ['west', /kensington|chelsea|hyde park|notting hill|richmond|hammersmith/i],
  ['greenwich', /greenwich|cutty sark/i],
  ['north', /camden|islington|hampstead|regent'?s park/i],
];

function areaGroup(area: string): string {
  return AREA_GROUPS.find(([, pattern]) => pattern.test(area))?.[0] || area.toLowerCase().trim();
}

function matchesHotelArea(area: string, chosen: string): boolean {
  if (chosen === "Doesn't matter") return true;
  const group = chosen.split(' ')[0].toLowerCase();
  if (group === 'south') return /south bank|waterloo|borough|london bridge|greenwich|brixton|clapham/i.test(area);
  return areaGroup(area) === group;
}

function hotelMaxNightlyPrice(priceRange: unknown): number | null {
  if (typeof priceRange !== 'string') return null;
  const prices = Array.from(priceRange.matchAll(/£\s?([\d,]+)/g), m => Number(m[1].replace(/,/g, '')));
  return prices.length ? Math.max(...prices) : null;
}

// Picks n items the trip hasn't used yet, in random order rather than
// always the first n in the array - without this, every visitor with the
// same interests got the identical itinerary, and items later in a
// collection never had a chance to be picked.
function pickN(arr: any[], n: number, exclude: Set<string>, area?: string, date?: Date) {
  const candidates = arr.filter(x => x?.id && x?.name && !exclude.has(x.id));
  // Do not schedule a venue whose published hours say it is closed at this
  // slot. Listings without parseable hours remain suggestions to verify.
  const open = date ? candidates.filter(x => openingStatusAt(x.openingHours, date) !== false) : candidates;
  const usable = open.length ? open : candidates.filter(x => openingStatusAt(x.openingHours, date) === null);
  const filtered = shuffle(usable).sort((a, b) => {
    const score = (item: any) => !area ? 0
      : (item.area || '').toLowerCase() === area.toLowerCase() ? 2
      : areaGroup(item.area || '') === areaGroup(area) ? 1 : 0;
    return score(b) - score(a);
  });
  const chosen = filtered.slice(0, n);
  chosen.forEach(c => exclude.add(c.id));
  return chosen;
}

function londonSlot(day: string, hour: number, minute = 0): Date {
  const utc = new Date(`${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`);
  const londonHour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', hourCycle: 'h23' }).format(utc));
  return new Date(utc.getTime() - (londonHour - hour) * 3600000);
}

function formatDayDate(start: string, dayOffset: number): string {
  return new Date(`${addCalendarDays(start, dayOffset)}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}

const FONT_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');";

export default function TripBuilderPage() {
  const [step, setStep] = useState<'form' | 'loading' | 'result' | 'error'>('form');
  const [days, setDays] = useState(3);
  const [minDate, setMinDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [budget, setBudget] = useState(500);
  const [interests, setInterests] = useState<string[]>([]);
  const [travelWith, setTravelWith] = useState('Friends');
  const [hotelArea, setHotelArea] = useState('Central London');
  const [itinerary, setItinerary] = useState<DayPlan[]>([]);
  const [hotelPicks, setHotelPicks] = useState<any[]>([]);
  const [tripCode] = useState(() => 'LDN-' + Math.random().toString(36).slice(2, 7).toUpperCase());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const today = londonToday();
    setMinDate(today);
    setStartDate(today);
    try {
      const encoded = new URLSearchParams(window.location.search).get('plan');
      if (!encoded || encoded.length > 10000) return;
      const plan = JSON.parse(decodeURIComponent(escape(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')))));
      if (!Array.isArray(plan.itinerary) || plan.itinerary.length > 7 || typeof plan.startDate !== 'string') return;
      setItinerary(plan.itinerary);
      setStartDate(plan.startDate);
      setDays(plan.itinerary.length);
      setHotelPicks(Array.isArray(plan.hotels) ? plan.hotels.slice(0, 3) : []);
      setStep('result');
    } catch { /* Ignore invalid shared links. */ }
  }, []);

  const saveTrip = () => {
    const plan = { itinerary, hotels: hotelPicks, startDate };
    localStorage.setItem('tap_saved_trip', JSON.stringify(plan));
    setSaved(true);
  };

  const shareTrip = async () => {
    const payload = unescape(encodeURIComponent(JSON.stringify({ itinerary, hotels: hotelPicks, startDate })));
    const encoded = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const url = `${window.location.origin}/trip-builder?plan=${encoded}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'My London trip', url }); } catch { /* Share dismissed. */ }
    } else {
      await navigator.clipboard.writeText(url);
      setSaved(true);
    }
  };

  const loadSaved = () => {
    try {
      const plan = JSON.parse(localStorage.getItem('tap_saved_trip') || 'null');
      if (!Array.isArray(plan?.itinerary) || plan.itinerary.length > 7) return;
      setItinerary(plan.itinerary);
      setHotelPicks(Array.isArray(plan.hotels) ? plan.hotels : []);
      setStartDate(plan.startDate || londonToday());
      setDays(plan.itinerary.length);
      setStep('result');
    } catch { /* Ignore stale local storage. */ }
  };

  const toggleInterest = (key: string) => {
    setInterests(prev => prev.includes(key) ? prev.filter(i => i !== key) : [...prev, key]);
  };

  const generate = async () => {
    setStep('loading');

    try {
      const neededCollections = new Set<string>(['places', 'food']);
      interests.forEach(key => {
        const opt = INTEREST_OPTIONS.find(o => o.key === key);
        opt?.collections.forEach(c => neededCollections.add(c));
      });
      const budgetLevel = budget < 300 ? 'low' : budget < 800 ? 'mid' : 'high';
      neededCollections.add('hotels');

      const dataCache: Record<string, any[]> = {};
      await Promise.all(
        Array.from(neededCollections).map(async (c) => {
          const items = await fetchCollection(c);
          dataCache[c] = items || [];
        })
      );

      // If the two core collections we always need came back completely
      // empty, treat this as a failed generation rather than silently
      // producing an itinerary full of blank/undefined slots.
      const gotAnyData = (dataCache.places?.length || 0) > 0 || (dataCache.food?.length || 0) > 0;
      if (!gotAnyData) {
        setStep('error');
        return;
      }

      // Reserve at most 60% of the total budget for accommodation. A hotel
      // whose published upper nightly price exceeds that cap is not a safe
      // recommendation, even when its category says "Budget".
      const nights = Math.max(1, days - 1);
      const nightlyCap = Math.floor(budget * 0.6 / nights);
      const affordableHotels = (dataCache.hotels || []).filter((h: any) => {
        const max = hotelMaxNightlyPrice(h.priceRange);
        return max !== null && max <= nightlyCap;
      });
      const nearbyHotels = affordableHotels.filter((h: any) => matchesHotelArea(h.area || '', hotelArea));
      const hotelResults = shuffle(nearbyHotels.length ? nearbyHotels : affordableHotels);
      setHotelPicks(hotelResults.slice(0, 3));

      const interestCollections = interests
        .map(key => INTEREST_OPTIONS.find(o => o.key === key))
        .filter(Boolean)
        .flatMap(o => o!.collections);

      const usedIds = new Set<string>();
      const plan: DayPlan[] = [];

      for (let d = 1; d <= days; d++) {
        const dayItems: DayPlan['items'] = [];
        const dayDate = addCalendarDays(startDate, d - 1);

        // Morning: interest-matched first, with layered fallbacks so this
        // slot is never left empty even if the preferred pool has nothing.
        let morningPool = interestCollections.includes('sports') && dataCache.sports?.length
          ? dataCache.sports
          : interestCollections.includes('hiddenGems') && dataCache.hiddenGems?.length
          ? dataCache.hiddenGems
          : (dataCache.places || []).filter((p: any) => p.category?.includes('Top') || p.category?.includes('Attraction'));
        if (!morningPool?.length) morningPool = dataCache.places || [];
        const morning = pickN(morningPool, 1, usedIds, undefined, londonSlot(dayDate, 10));
        morning.forEach(p => dayItems.push({ time: '10:00', name: p.name, area: p.area, href: dataCache.sports?.includes(p) ? (p.mapsUrl || '/sports') : (dataCache.hiddenGems?.includes(p) ? (p.mapsUrl || '/hidden-gems') : '/places/' + p.id), slot: 'Morning' }));

        // Lunch: budget-filtered, avoiding an area used earlier the same
        // day where possible for a bit more variety across the trip.
        let foodPool = (dataCache.food || []).filter((f: any) => {
          const pr = (f.priceRange || '').toString();
          const level = (pr.match(/£/g) || []).length;
          if (budgetLevel === 'low') return level <= 1;
          if (budgetLevel === 'mid') return level <= 2;
          return true;
        });
        if (!foodPool.length) foodPool = dataCache.food || [];
        const lunch = pickN(foodPool, 1, usedIds, morning[0]?.area, londonSlot(dayDate, 13));
        lunch.forEach(f => dayItems.push({ time: '13:00', name: f.name, area: f.area, href: `/food/${f.id}`, slot: 'Lunch' }));

        // Afternoon: rotate through matched interests across days instead
        // of always favouring the same one, so a multi-day trip doesn't
        // repeat "shopping" every single afternoon when shopping + theatre
        // are both selected.
        const afternoonOptions: { pool: any[]; base: string; detail: boolean }[] = [];
        if (interests.includes('shopping') && dataCache.shopping?.length) afternoonOptions.push({ pool: dataCache.shopping, base: '/shopping/', detail: true });
        if (interests.includes('theatre') && dataCache.theatre?.length) afternoonOptions.push({ pool: dataCache.theatre, base: '/theatre', detail: false });
        if (interests.includes('music') && dataCache.music?.length) afternoonOptions.push({ pool: dataCache.music, base: '/music', detail: false });
        let afternoonPool = dataCache.places || [];
        let afternoonBase = '/places/';
        let afternoonHasDetail = true;
        if (afternoonOptions.length) {
          const pick = afternoonOptions[(d - 1) % afternoonOptions.length];
          afternoonPool = pick.pool;
          afternoonBase = pick.base;
          afternoonHasDetail = pick.detail;
        }
        if (!afternoonPool?.length) { afternoonPool = dataCache.places || []; afternoonBase = '/places/'; }
        const afternoon = pickN(afternoonPool, 1, usedIds, lunch[0]?.area || morning[0]?.area, londonSlot(dayDate, 15));
        afternoon.forEach(p => dayItems.push({ time: '15:00', name: p.name, area: p.area, href: afternoonHasDetail ? afternoonBase + p.id : (p.mapsUrl || afternoonBase), slot: 'Afternoon' }));

        // Evening: stay near the afternoon stop when a suitable venue exists.
        let eveningPool = interests.includes('nightlife') && dataCache.nightlife?.length ? dataCache.nightlife : dataCache.food || [];
        const evening = pickN(eveningPool, 1, usedIds, afternoon[0]?.area || lunch[0]?.area, londonSlot(dayDate, 19, 30));
        evening.forEach(p => dayItems.push({
          time: '19:30', name: p.name, area: p.area,
          href: dataCache.nightlife?.includes(p) ? `/nightlife/${p.id}` : `/food/${p.id}`,
          slot: 'Evening',
        }));

        plan.push({ day: d, items: dayItems });
      }

      setItinerary(plan);
      setSaved(false);
      setStep('result');
    } catch {
      setStep('error');
    }
  };

  const reset = () => {
    setStep('form');
    setItinerary([]);
    setHotelPicks([]);
  };

  return (
    <main style={{ minHeight: '100vh', background: '#0f0f1c' }}>
      <style>{FONT_IMPORT}</style>

      {/* HERO */}
      <div style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(201,168,76,0.12), transparent), #12121f',
        padding: '70px 20px 50px', borderBottom: '1px solid rgba(201,168,76,0.15)',
      }}>
        <div style={{ maxWidth: '920px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px', fontFamily: "'DM Mono', monospace",
            fontSize: '0.68rem', color: '#c9a84c', letterSpacing: '3px', textTransform: 'uppercase' as const,
            border: '1px solid rgba(201,168,76,0.3)', borderRadius: '40px', padding: '6px 16px', marginBottom: '22px',
          }}>
            ✦ London Itinerary Builder
          </div>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: '#fff',
            fontSize: 'clamp(2.2rem, 6vw, 4rem)', lineHeight: 1.05, margin: '0 0 18px', letterSpacing: '-0.01em',
          }}>
            Build My<br /><span style={{ color: '#c9a84c', fontStyle: 'italic' }}>London Trip</span>
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '1.05rem', color: 'rgba(255,255,255,0.5)', maxWidth: '480px', margin: '0 auto' }}>
            Tell us your dates, budget and interests — we'll suggest places from the TAP LONDON directory.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '780px', margin: '0 auto', padding: '48px 20px 100px' }}>
        {step === 'form' && (
          <div style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
            border: '1px solid rgba(201,168,76,0.18)', borderRadius: '22px', padding: 'clamp(24px, 5vw, 46px)',
          }}>
            <FormField label="First day in London">
              <input type="date" min={minDate || undefined} value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '10px 14px', borderRadius: '10px', color: '#1a1a2e' }} />
            </FormField>
            <FormField label="Trip Length">
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', marginBottom: '14px' }}>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '2.6rem', fontWeight: 700, color: '#c9a84c', lineHeight: 1 }}>{days}</span>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>{days === 1 ? 'day' : 'days'} in London</span>
              </div>
              <input type="range" min={1} max={7} value={days} onChange={e => setDays(Number(e.target.value))} className="tap-slider" />
            </FormField>

            <FormField label="Budget">
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '14px' }}>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '2.6rem', fontWeight: 700, color: '#c9a84c', lineHeight: 1 }}>£{budget}</span>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginLeft: '8px' }}>total trip budget</span>
              </div>
              <input type="range" min={100} max={2000} step={50} value={budget} onChange={e => setBudget(Number(e.target.value))} className="tap-slider" />
            </FormField>

            <FormField label="What are you into">
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '9px' }}>
                {INTEREST_OPTIONS.map(opt => {
                  const active = interests.includes(opt.key);
                  return (
                    <button key={opt.key} onClick={() => toggleInterest(opt.key)} style={{
                      padding: '10px 18px', borderRadius: '10px', cursor: 'pointer',
                      fontFamily: "'DM Sans', sans-serif", fontSize: '0.82rem', fontWeight: 600,
                      background: active ? 'linear-gradient(135deg,#c9a84c,#e0be6a)' : 'rgba(255,255,255,0.05)',
                      color: active ? '#1a1a2e' : 'rgba(255,255,255,0.75)',
                      border: active ? '1px solid transparent' : '1px solid rgba(255,255,255,0.1)',
                      transition: 'all 0.15s',
                    }}>{opt.icon} {opt.label}</button>
                  );
                })}
              </div>
            </FormField>

            <FormField label="Travelling With">
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '9px' }}>
                {TRAVEL_WITH.map(t => (
                  <PillButton key={t} active={travelWith === t} onClick={() => setTravelWith(t)}>{t}</PillButton>
                ))}
              </div>
            </FormField>

            <FormField label="Hotel Area" last>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '9px' }}>
                {HOTEL_AREAS.map(a => (
                  <PillButton key={a} active={hotelArea === a} onClick={() => setHotelArea(a)}>{a}</PillButton>
                ))}
              </div>
            </FormField>

            <button onClick={generate} disabled={!startDate} style={{
              width: '100%', marginTop: '36px', padding: '18px', borderRadius: '14px', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg,#c9a84c,#e8c46f)', color: '#1a1a2e',
              fontFamily: "'DM Sans', sans-serif", fontSize: '1.02rem', fontWeight: 700,
              boxShadow: '0 8px 30px rgba(201,168,76,0.25)', letterSpacing: '0.2px',
            }}>Generate my trip →</button>
            <button onClick={loadSaved} style={{ display: 'block', margin: '18px auto 0', color: '#c9a84c', background: 'none', border: 'none', cursor: 'pointer' }}>Open my saved trip</button>
          </div>
        )}

        {step === 'loading' && (
          <div style={{ textAlign: 'center', padding: '100px 20px' }}>
            <div style={{
              width: '54px', height: '54px', margin: '0 auto 24px', borderRadius: '50%',
              border: '2px solid rgba(201,168,76,0.2)', borderTopColor: '#c9a84c',
              animation: 'tap-spin 0.9s linear infinite',
            }} />
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)' }}>
              Drafting your {days}-day itinerary...
            </p>
            <style>{'@keyframes tap-spin { to { transform: rotate(360deg); } }'}</style>
          </div>
        )}

        {step === 'error' && (
          <div style={{ textAlign: 'center', padding: '80px 20px', fontFamily: "'DM Sans', sans-serif" }}>
            <div style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '20px', fontSize: '0.92rem' }}>
              Couldn't build your trip right now. Please try again.
            </div>
            <button onClick={generate} style={{
              background: 'linear-gradient(135deg,#c9a84c,#e8c46f)', color: '#1a1a2e', border: 'none',
              borderRadius: '10px', padding: '12px 26px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
            }}>Retry</button>
          </div>
        )}

        {step === 'result' && (
          <div>
            <button onClick={reset} style={{
              background: 'rgba(255,255,255,0.06)', border: 'none', color: 'rgba(255,255,255,0.6)',
              borderRadius: '10px', padding: '9px 18px', fontFamily: "'DM Sans', sans-serif",
              fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', marginBottom: '28px',
            }}>← Build another trip</button>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button onClick={saveTrip} style={{ padding: '9px 16px', borderRadius: '10px', background: '#c9a84c', color: '#1a1a2e', border: 0, cursor: 'pointer' }}>{saved ? 'Saved on this device ✓' : 'Save trip'}</button>
              <button onClick={shareTrip} style={{ padding: '9px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 0, cursor: 'pointer' }}>Share trip</button>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', marginBottom: '20px' }}>Suggested route based on areas and published hours. Check venue hours and travel times before you go.</p>

            {/* TRIP SUMMARY STRIP */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
              borderBottom: '1px dashed rgba(201,168,76,0.35)', paddingBottom: '20px', marginBottom: '36px', flexWrap: 'wrap' as const, gap: '16px',
            }}>
              <div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.66rem', color: '#c9a84c', letterSpacing: '2px', marginBottom: '6px' }}>TRIP {tripCode}</div>
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(1.7rem, 4vw, 2.4rem)', fontWeight: 700, color: '#fff', margin: 0 }}>
                  {days}-Day London Itinerary
                </h2>
              </div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', textAlign: 'right' as const }}>
                £{budget} · {travelWith}<br />
                {interests.map(i => INTEREST_OPTIONS.find(o => o.key === i)?.label).join(' · ') || 'General sightseeing'}
              </div>
            </div>

            {hotelPicks.length > 0 && (
              <div style={{ marginBottom: '40px' }}>
                <SectionLabel>🏨 Suggested Stay — {hotelArea}</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: '10px', marginTop: '14px' }}>
                  {hotelPicks.map(h => (
                    <Link key={h.id} href={h.mapsUrl || '/hotels'} style={{ textDecoration: 'none' }}>
                      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px 16px' }}>
                        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>{h.name}</div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', color: '#c9a84c', marginTop: '2px' }}>{h.priceRange}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {hotelPicks.length === 0 && (
              <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '32px' }}>
                No hotel in our directory fits the accommodation share of this total budget. Check live room rates before booking.
              </p>
            )}

            {/* DAY TICKETS */}
            <div style={{ display: 'grid', gap: '22px' }}>
              {itinerary.map(day => (
                <div key={day.day} style={{
                  position: 'relative', background: 'linear-gradient(135deg, rgba(201,168,76,0.07), rgba(255,255,255,0.02))',
                  border: '1px solid rgba(201,168,76,0.22)', borderRadius: '18px', overflow: 'hidden',
                }}>
                  <div style={{ display: 'flex', alignItems: 'stretch' }}>
                    {/* Ticket stub */}
                    <div style={{
                      background: 'linear-gradient(160deg,#c9a84c,#a8842f)', minWidth: '84px', display: 'flex',
                      flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', padding: '18px 10px',
                      borderRight: '2px dashed rgba(15,15,28,0.35)',
                    }}>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.6rem', color: 'rgba(26,26,46,0.6)', letterSpacing: '1px' }}>DAY</div>
                      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '2.4rem', fontWeight: 700, color: '#1a1a2e', lineHeight: 1 }}>{day.day}</div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.56rem', color: 'rgba(26,26,46,0.55)', marginTop: '4px', textAlign: 'center' as const }}>{formatDayDate(startDate, day.day - 1)}</div>
                    </div>

                    <div style={{ padding: '20px clamp(16px,3vw,26px)', flex: 1 }}>
                      <div style={{ display: 'grid', gap: '4px' }}>
                        {day.items.length === 0 && (
                          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', padding: '8px' }}>
                            No spots left to suggest for this day — browse <Link href="/places" style={{ color: '#c9a84c' }}>Places</Link> for more ideas.
                          </div>
                        )}
                        {day.items.map((item, i) => (
                          <Link key={i} href={item.href} style={{ textDecoration: 'none' }}>
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: '16px', padding: '10px 8px', borderRadius: '8px',
                              transition: 'background 0.15s',
                            }} className="tap-itinerary-row">
                              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.72rem', color: '#c9a84c', minWidth: '46px' }}>{item.time}</div>
                              <div style={{ width: '1px', height: '28px', background: 'rgba(201,168,76,0.25)' }} />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.08rem', fontWeight: 700, color: '#fff' }}>{item.name}</div>
                                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.66rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                                  {item.slot}{item.area ? ` · ${item.area}` : ''}
                                </div>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .tap-slider {
          -webkit-appearance: none; width: 100%; height: 4px; border-radius: 4px;
          background: rgba(255,255,255,0.12); outline: none;
        }
        .tap-slider::-webkit-slider-thumb {
          -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%;
          background: #c9a84c; cursor: pointer; border: 3px solid #12121f;
          box-shadow: 0 0 0 1px rgba(201,168,76,0.4);
        }
        .tap-itinerary-row:hover { background: rgba(255,255,255,0.04); }
      `}</style>
    </main>
  );
}

function FormField({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ marginBottom: last ? 0 : '30px' }}>
      <div style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase' as const, letterSpacing: '1.5px', marginBottom: '14px',
      }}>{label}</div>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: "'DM Sans', sans-serif", fontSize: '0.72rem', fontWeight: 700, color: '#c9a84c',
      textTransform: 'uppercase' as const, letterSpacing: '1.2px',
    }}>{children}</div>
  );
}

function PillButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 18px', borderRadius: '10px', cursor: 'pointer',
      fontFamily: "'DM Sans', sans-serif", fontSize: '0.82rem', fontWeight: 600,
      background: active ? 'linear-gradient(135deg,#c9a84c,#e0be6a)' : 'rgba(255,255,255,0.05)',
      color: active ? '#1a1a2e' : 'rgba(255,255,255,0.75)',
      border: active ? '1px solid transparent' : '1px solid rgba(255,255,255,0.1)',
    }}>{children}</button>
  );
}
