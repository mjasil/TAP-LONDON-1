'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { requestMobilePosition } from '@/lib/mobileLocation';
import { loadNearbyArea, withNearbyDeadline } from '@/lib/nearbyRequest';
import Link from 'next/link';
import { fetchCollection } from '@/lib/firestore';
import { addCalendarDays, londonToday, occursInWindow } from '@/lib/eventDates';
import { isPublishedEvent } from '@/lib/verifiedEvent';

const CATEGORIES = [
  { label: 'Food', icon: '🍽️', collection: 'food' },
  { label: 'Places', icon: '🏛️', collection: 'places' },
  { label: 'Nightlife', icon: '🌙', collection: 'nightlife' },
  { label: 'Hotels', icon: '🏨', collection: 'hotels' },
  { label: 'Kids', icon: '👨\u200d👩\u200d👧', collection: 'kids' },
  { label: 'Hidden Gems', icon: '💎', collection: 'hiddenGems' },
  { label: 'Shopping', icon: '🛍️', collection: 'shopping' },
  { label: 'Events', icon: '📅', collection: 'events' },
];

const DETAIL_PATHS: Record<string, string> = {
  food: 'food', places: 'places', nightlife: 'nightlife', hotels: 'hotels',
  kids: 'kids', hiddenGems: 'hidden-gems', shopping: 'shopping',
  events: 'events',
};

type EventWindow = 'today' | 'tomorrow' | 'weekend';
function eventDates(window: EventWindow): [string, string] {
  const today = londonToday();
  if (window === 'tomorrow') {
    const tomorrow = addCalendarDays(today, 1);
    return [tomorrow, tomorrow];
  }
  if (window === 'weekend') {
    const day = new Date(`${today}T12:00:00Z`).getUTCDay();
    const saturday = addCalendarDays(today, day === 0 ? 0 : (6 - day + 7) % 7);
    return [saturday, day === 0 ? saturday : addCalendarDays(saturday, 1)];
  }
  return [today, today];
}

const AREA_COORDS: Record<string, [number, number]> = {
  'w1d 6ds': [51.512221, -0.133410],
  'soho': [51.5130, -0.1310], 'covent garden': [51.5117, -0.1240],
  'mayfair': [51.5100, -0.1470], 'westminster': [51.4994, -0.1248],
  'shoreditch': [51.5237, -0.0779], 'camden': [51.5392, -0.1426],
  'notting hill': [51.5143, -0.1968], 'south bank': [51.5055, -0.1100],
  'london bridge': [51.5045, -0.0865], 'canary wharf': [51.5054, -0.0235],
  'greenwich': [51.4777, -0.0007], 'kensington': [51.4991, -0.1938],
  'chelsea': [51.4875, -0.1687], 'brixton': [51.4627, -0.1145],
  'hackney': [51.5450, -0.0553], 'islington': [51.5362, -0.1033],
  'whitechapel': [51.5158, -0.0640], 'holborn': [51.5174, -0.1200],
  'city of london': [51.5155, -0.0922], 'clerkenwell': [51.5229, -0.1069],
  'bermondsey': [51.4979, -0.0798], 'stratford': [51.5416, -0.0029],
  'kings cross': [51.5309, -0.1233], 'paddington': [51.5154, -0.1755],
  'victoria': [51.4965, -0.1439], 'waterloo': [51.5036, -0.1143],
  'oxford street': [51.5153, -0.1426], 'bond street': [51.5143, -0.1494],
  'knightsbridge': [51.5015, -0.1607], 'piccadilly': [51.5101, -0.1337],
  'trafalgar square': [51.5080, -0.1281], 'strand': [51.5120, -0.1180],
  'tower hill': [51.5098, -0.0770], 'tower bridge': [51.5055, -0.0754],
  'wembley': [51.5560, -0.2796], 'wimbledon': [51.4214, -0.2058],
  'richmond': [51.4613, -0.3037], 'heathrow': [51.4700, -0.4543],
  'clapham': [51.4620, -0.1383], 'fulham': [51.4787, -0.1917],
  'putney': [51.4619, -0.2161], 'balham': [51.4432, -0.1528],
  'peckham': [51.4736, -0.0699], 'bethnal green': [51.5266, -0.0603],
  'walthamstow': [51.5768, -0.0185], 'tottenham': [51.6008, -0.0671],
  'hampstead': [51.5568, -0.1781], 'highbury': [51.5523, -0.0973],
  'stoke newington': [51.5643, -0.0742], 'dalston': [51.5456, -0.0753],
  'vauxhall': [51.4855, -0.1228], 'elephant and castle': [51.4956, -0.1004],
  'borough': [51.5015, -0.0942], 'aldgate': [51.5141, -0.0773],
  'bow': [51.5269, -0.0204], 'mile end': [51.5253, -0.0333],
  'stepney': [51.5168, -0.0431], 'poplar': [51.5098, -0.0176],
  'limehouse': [51.5122, -0.0322], 'isle of dogs': [51.4940, -0.0153],
  'deptford': [51.4778, -0.0233], 'lewisham': [51.4615, -0.0122],
  'catford': [51.4448, -0.0209], 'forest hill': [51.4383, -0.0522],
  'crystal palace': [51.4154, -0.0714], 'croydon': [51.3714, -0.0983],
  'ealing': [51.5130, -0.3089], 'acton': [51.5086, -0.2694],
  'chiswick': [51.4853, -0.2472], 'hammersmith': [51.4927, -0.2239],
  "shepherd's bush": [51.5042, -0.2275], 'ladbroke grove': [51.5165, -0.2093],
  'bloomsbury': [51.5194, -0.1269], 'south kensington': [51.4944, -0.1741],
  'bankside': [51.5066, -0.0980], 'marylebone': [51.5225, -0.1548],
  'west end': [51.5115, -0.1280], 'charing cross': [51.5074, -0.1278],
  "st paul's": [51.5138, -0.0984], 'euston': [51.5282, -0.1337],
  'seven dials': [51.5145, -0.1261], 'fitzrovia': [51.5198, -0.1357],
  'farringdon': [51.5202, -0.1053], 'brick lane': [51.5232, -0.0718],
  "regent's park": [51.5313, -0.1569], 'hyde park': [51.5073, -0.1657],
  'kew': [51.4770, -0.2840], 'battersea': [51.4790, -0.1490],
  'spitalfields': [51.5190, -0.0750], 'regent street': [51.5115, -0.1380],
  'docklands': [51.5060, -0.0220], 'borough market': [51.5054, -0.0910],
  'chinatown': [51.5112, -0.1317],
  'st james': [51.5078, -0.1375],
};
const AREA_MATCHES = Object.entries(AREA_COORDS).sort((a, b) => b[0].length - a[0].length);
// These neighbourhoods have Kids listings in the curated directory. Prioritise
// the closest of them instead of spending requests on empty nearby areas.
const KIDS_AREAS = new Set([
  'w1d 6ds', 'soho', 'chinatown', 'piccadilly', 'west end',
  'south kensington', "regent's park", 'hyde park', 'south bank', 'canary wharf',
  'richmond', 'bethnal green', 'stratford', 'battersea', 'tower hill', 'chelsea',
  'islington', 'kensington', 'greenwich', 'croydon', 'acton', 'hackney',
  'hampstead', 'bloomsbury', 'knightsbridge', 'forest hill', 'clerkenwell',
  'covent garden', 'westminster', 'camden', 'hammersmith', 'lewisham', 'ealing',
  'chiswick',
]);

function getAreaCoords(area: string): [number, number] | null {
  if (!area) return null;
  const lower = area.toLowerCase();
  // Specific neighbourhoods must win over broad names like Kensington.
  for (const [key, coords] of AREA_MATCHES) {
    if (lower.includes(key)) return coords;
  }
  return null;
}

function distKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function isInGreaterLondon(pos: {lat: number; lng: number}) {
  return pos.lat >= 51.2 && pos.lat <= 51.75 && pos.lng >= -0.6 && pos.lng <= 0.35;
}

function nearMeImage(image: string): string {
  try {
    const url = new URL(image);
    if (url.hostname === 'res.cloudinary.com' && url.pathname.includes('/image/upload/')) {
      return image.replace('/image/upload/', '/image/upload/c_fill,w_160,h_160/');
    }
    if (url.hostname === 'images.unsplash.com') {
      url.searchParams.set('w', '160');
      url.searchParams.set('h', '160');
      url.searchParams.set('fit', 'crop');
      return url.toString();
    }
    if (url.hostname === 'images.pexels.com') {
      url.searchParams.set('w', '160');
      url.searchParams.set('h', '160');
      url.searchParams.set('auto', 'compress');
      return url.toString();
    }
  } catch { /* An admin URL can still be used unchanged. */ }
  return image;
}

function NearMeThumbnail({ item, collection }: { item: any; collection: string }) {
  const [failed, setFailed] = useState(false);
  const image = collection === 'events' && item.imageRightsConfirmed !== true ? '' : item.image;
  return <div style={{ width: '60px', height: '60px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, background: '#e8e7e2' }}>
    {image && !failed ? <img src={nearMeImage(image)} alt={item.name} width={160} height={160}
      loading="lazy" decoding="async" onError={() => setFailed(true)}
      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      : <span aria-label={`Photo unavailable for ${item.name}`} style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#777', fontSize: '1.3rem' }}>📍</span>}
  </div>;
}

function isApproximatePosition(position: GeolocationPosition) {
  return position.coords.accuracy > 500 || Date.now() - position.timestamp > 60000;
}

export default function NearMe() {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('food');
  const [status, setStatus] = useState<'idle'|'requesting'|'loading'|'done'|'error'>('idle');
  const [results, setResults] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [locationBlocked, setLocationBlocked] = useState(false);
  const [userPos, setUserPos] = useState<{lat:number;lng:number}|null>(null);
  const [isApproxLocation, setIsApproxLocation] = useState(false);
  const [manualArea, setManualArea] = useState('');
  const [eventWindow, setEventWindow] = useState<EventWindow>('today');
  const requestId = useRef(0);
  const locationRequestId = useRef(0);
  const cancelLocation = useRef<() => void>(() => {});
  const listingsController = useRef<AbortController | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const openButton = useRef<HTMLButtonElement>(null);
  const closePanel = useCallback(() => {
    requestId.current++;
    locationRequestId.current++;
    cancelLocation.current();
    listingsController.current?.abort();
    setOpen(false);
  }, []);

  useEffect(() => () => {
    locationRequestId.current++;
    requestId.current++;
    cancelLocation.current();
    listingsController.current?.abort();
  }, []);

  useEffect(() => {
    if (!open) return;
    // Render above the homepage's clipped/stacked containers and keep the
    // background still while the sheet itself scrolls on iOS and Android.
    const y = window.scrollY;
    const body = document.body;
    const previous = { position: body.style.position, top: body.style.top, width: body.style.width, overflow: body.style.overflow };
    Object.assign(body.style, { position: 'fixed', top: `-${y}px`, width: '100%', overflow: 'hidden' });
    closeButton.current?.focus({ preventScroll: true });
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') closePanel(); };
    document.addEventListener('keydown', escape);
    return () => {
      Object.assign(body.style, previous);
      window.scrollTo(0, y);
      document.removeEventListener('keydown', escape);
      openButton.current?.focus({ preventScroll: true });
    };
  }, [open, closePanel]);

  const findNearby = useCallback(async (collection: string, pos: {lat:number;lng:number}, approximate = false, window: EventWindow = 'today') => {
    const currentRequest = ++requestId.current;
    listingsController.current?.abort();
    const controller = new AbortController();
    listingsController.current = controller;
    setStatus('loading');
    setErrorMsg('');
    setLocationBlocked(false);
    setResults([]);
    try {
      // Directory pages are bounded. Do not download hundreds of venue records
      // (and their large descriptions) to the browser for a twelve-card panel.
      const nearbyAreas = Object.entries(AREA_COORDS)
        .map(([area, coords]) => ({ area, km: distKm(pos.lat, pos.lng, coords[0], coords[1]) }))
        .sort((a, b) => a.km - b.km);
      const searchAreas = collection === 'kids'
        ? nearbyAreas.filter(({ area }) => KIDS_AREAS.has(area))
        : nearbyAreas;
      let items: any[];
      if (collection === 'events' || collection === 'hiddenGems') {
        const rows = await withNearbyDeadline(fetchCollection(collection));
        if (!rows) throw new Error('Listings unavailable');
        const [start, end] = eventDates(window);
        items = collection === 'events'
          ? rows.filter(item => isPublishedEvent(item) && occursInWindow(item, start, end))
          : rows;
      } else {
        const loadAreas = async (areas: typeof nearbyAreas) => {
          const responses = await Promise.allSettled(areas.map(async ({ area }) => {
            // A postcode pin represents the surrounding streets, whose real
            // venue postcodes differ from the pin's exact postcode.
            const query = area === 'w1d 6ds' ? 'w1d' : area;
            const rows = await loadNearbyArea(collection, query, controller.signal);
            return rows.filter((item: any) => {
              const areaName = String(item.area || item.location || '').toLowerCase().replace(/[’']/g, '');
              return areaName.includes(query);
            });
          }));
          const successful = responses.filter((result): result is PromiseFulfilledResult<any[]> => result.status === 'fulfilled');
          return { items: successful.flatMap(result => result.value), successCount: successful.length };
        };
        const first = await loadAreas(searchAreas.slice(0, 8));
        if (controller.signal.aborted) return;
        items = first.items;
        // Keep searching until the twelve-card panel is full. The former
        // five-result threshold hid real venues in neighbouring areas.
        if (new Set(items.map(item => item.id)).size < 12) {
          const second = await loadAreas(searchAreas.slice(8, 16));
          if (first.successCount + second.successCount === 0) throw new Error('Listings unavailable');
          if (controller.signal.aborted) return;
          items.push(...second.items);
        }
        if (collection === 'kids' && new Set(items.map(item => item.id)).size < 5) {
          // Cover the remaining curated Kids areas before returning a sparse
          // panel; the result still sorts by geographic distance below.
          const more = await loadAreas(searchAreas.slice(16));
          items.push(...more.items);
        }
      }
      if (currentRequest !== requestId.current || controller.signal.aborted) return;
      const unique = Array.from(new Map(items.map(item => [item.id, item])).values());
      const withDist = unique.map((item: any) => {
        const latitude = Number(item.latitude ?? item.lat);
        const longitude = Number(item.longitude ?? item.lng);
        const exact = Number.isFinite(latitude) && Number.isFinite(longitude) && latitude > 50 && latitude < 52 && longitude > -1 && longitude < 1;
        const coords: [number, number] | null = exact ? [latitude, longitude] : getAreaCoords(item.area || item.location || '');
        const sortDistance = coords ? distKm(pos.lat, pos.lng, coords[0], coords[1]) : null;
        // Area centroids are useful for sorting, but aren't the venue's
        // coordinates. Never display them as a measured distance.
        const dist = exact && !approximate && sortDistance !== null ? Math.round(sortDistance * 10) / 10 : null;
        return { ...item, dist, sortDistance };
      });

      const matched = withDist.filter((i: any) => i.sortDistance !== null).sort((a: any, b: any) => a.sortDistance - b.sortDistance);
      setResults(matched.slice(0, 12));
      setStatus('done');
    } catch {
      if (currentRequest !== requestId.current || controller.signal.aborted) return;
      setErrorMsg('Could not load places. Please try again.');
      setStatus('error');
    }
  }, []);

  const useManualArea = () => {
    const coords = AREA_COORDS[manualArea];
    if (!coords) return;
    locationRequestId.current++;
    cancelLocation.current();
    setUserPos({ lat: coords[0], lng: coords[1] });
    setIsApproxLocation(true);
    setErrorMsg('');
    findNearby(activeCategory, { lat: coords[0], lng: coords[1] }, true, eventWindow);
  };

  const requestLocation = useCallback((collection: string, window: EventWindow = eventWindow) => {
    cancelLocation.current();
    listingsController.current?.abort();
    requestId.current++;
    const locationRequest = ++locationRequestId.current;
    // Set state first so a synchronous failure cannot be overwritten with
    // 'requesting'. Keep the native permission call in the original tap.
    setOpen(true);
    setActiveCategory(collection);
    setStatus('requesting');
    setErrorMsg('');
    setLocationBlocked(false);
    let geolocation: Geolocation | undefined;
    try { geolocation = navigator.geolocation; } catch { /* Restricted webview. */ }
    cancelLocation.current = requestMobilePosition(geolocation,
      position => {
        if (locationRequest !== locationRequestId.current) return;
        const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
        if (!isInGreaterLondon(pos)) {
          setUserPos(null);
          setErrorMsg('Near Me currently covers London. Choose a London area below.');
          setStatus('error');
          return;
        }
        setManualArea('');
        const approximate = isApproximatePosition(position);
        setIsApproxLocation(approximate);
        setUserPos(pos);
        findNearby(collection, pos, approximate, window);
      },
      error => {
        if (locationRequest !== locationRequestId.current) return;
        setLocationBlocked(error.code === 1);
        setErrorMsg(error.code === 1
          ? 'Location is blocked. Allow location for this website, or choose a London area above.'
          : 'Your browser could not find your location. Choose a London area above, or try again.');
        setStatus('error');
      },
      () => locationRequest === locationRequestId.current,
    );
  }, [eventWindow, findNearby]);

  const handleOpen = () => {
    setEventWindow('today');
    requestLocation('food', 'today');
  };

  const handleCategoryChange = (collection: string) => {
    if (!userPos) { requestLocation(collection); return; }
    locationRequestId.current++;
    cancelLocation.current();
    setActiveCategory(collection);
    findNearby(collection, userPos, isApproxLocation, eventWindow);
  };

  if (!open) return (
    <button
      ref={openButton}
      type="button"
      onClick={handleOpen}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        background: 'linear-gradient(135deg, rgba(26,26,46,0.9), rgba(45,45,78,0.9))',
        color: '#c9a84c', border: '1px solid rgba(201,168,76,0.4)',
        borderRadius: '50px', padding: '12px 22px',
        fontFamily: "'DM Sans', sans-serif", fontSize: '0.86rem', fontWeight: 700,
        cursor: 'pointer', backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
      </svg>
      Near Me
    </button>
  );

  return createPortal(
    <div
      onClick={closePanel}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9998, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    >
      <div className="near-me-panel" role="dialog" aria-modal="true" aria-label="Near Me" onClick={e => e.stopPropagation()} style={{ background: '#f9f7f2', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '620px', paddingBottom: 'env(safe-area-inset-bottom, 0px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: '#1a1a2e', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>📍 Near Me</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>
              {status === 'requesting' && 'Finding your location...'}
              {status === 'loading' && 'Finding nearest places...'}
              {status === 'done' && userPos && (isApproxLocation ? `Showing areas around ${manualArea || 'your approximate location'} (approximate)` : 'London listings ordered by proximity')}
              {status === 'error' && (locationBlocked ? 'Location permission needed' : 'Choose an area or try again')}
              {status === 'idle' && 'Finding your location...'}
            </div>
          </div>
          <button ref={closeButton} type="button" onClick={closePanel} aria-label="Close Near Me" style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', width: '34px', height: '34px', borderRadius: '50%', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
        </div>

        {/* Category tabs */}
        <div style={{ background: '#fff', padding: '12px 16px', display: 'flex', gap: '8px', overflowX: 'auto', flexShrink: 0, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          {CATEGORIES.map(cat => (
            <button key={cat.collection} onClick={() => handleCategoryChange(cat.collection)}
              style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 14px', borderRadius: '40px', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s', background: activeCategory === cat.collection ? '#1a1a2e' : 'rgba(26,26,46,0.07)', color: activeCategory === cat.collection ? '#c9a84c' : '#555' }}>
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        {activeCategory === 'events' && (
          <div role="group" aria-label="Event date" style={{ display: 'flex', gap: '8px', background: '#fff', padding: '10px 16px', flexShrink: 0 }}>
            {(['today', 'tomorrow', 'weekend'] as const).map(window => (
              <button key={window} type="button" aria-pressed={eventWindow === window}
                onClick={() => { setEventWindow(window); if (userPos) findNearby('events', userPos, isApproxLocation, window); }}
                style={{ border: 'none', borderRadius: '20px', padding: '8px 12px', fontWeight: 700, background: eventWindow === window ? '#c9a84c' : '#f1f1f1', color: '#1a1a2e' }}>
                {window === 'weekend' ? 'This weekend' : window[0].toUpperCase() + window.slice(1)}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 16px', background: '#fff', flexShrink: 0 }}>
          <label htmlFor="near-me-area" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1a1a2e', whiteSpace: 'nowrap' }}>Or choose an area</label>
          <select id="near-me-area" value={manualArea} onChange={e => setManualArea(e.target.value)}
            style={{ minWidth: 0, flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #ddd', color: '#1a1a2e', background: '#fff' }}>
            <option value="">London area</option>
            {Object.keys(AREA_COORDS).sort().map(area => <option key={area} value={area}>{area === 'w1d 6ds' ? 'W1D 6DS · Soho / Chinatown' : area.replace(/\b\w/g, c => c.toUpperCase())}</option>)}
          </select>
          <button type="button" disabled={!manualArea} onClick={useManualArea}
            style={{ padding: '9px 12px', border: 0, borderRadius: '8px', background: '#1a1a2e', color: '#c9a84c', fontWeight: 700, opacity: manualArea ? 1 : 0.5 }}>Show</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', padding: '16px' }}>

          {/* Requesting permission */}
          {status === 'requesting' && (
            <div style={{ textAlign: 'center', padding: '48px 20px', fontFamily: "'DM Sans', sans-serif" }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📍</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1a1a2e', marginBottom: '8px' }}>Finding your location</div>
              <div style={{ fontSize: '0.82rem', color: '#888', lineHeight: 1.6, maxWidth: '280px', margin: '0 auto' }}>
                If your browser asks, tap <strong>"Allow"</strong>. You can choose a London area above at any time.
              </div>
            </div>
          )}

          {/* Loading */}
          {status === 'loading' && (
            <div style={{ textAlign: 'center', padding: '48px 20px', fontFamily: "'DM Sans', sans-serif" }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px', animation: 'spin 1s linear infinite', display: 'inline-block' }}>🔍</div>
              <div style={{ fontSize: '0.9rem', color: '#888' }}>Finding nearest places...</div>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div style={{ textAlign: 'center', padding: '40px 20px', fontFamily: "'DM Sans', sans-serif" }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '14px' }}>📍</div>
              <div role="alert" style={{ color: '#b83d3d', marginBottom: '12px', fontSize: '0.88rem', fontWeight: 600 }}>{errorMsg}</div>
              <button onClick={() => requestLocation(activeCategory)} style={{ background: '#1a1a2e', color: '#c9a84c', border: 'none', borderRadius: '10px', padding: '12px 24px', fontFamily: "'DM Sans', sans-serif", fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer' }}>
                {locationBlocked ? 'I’ve allowed location — retry' : 'Try Again'}
              </button>
              {locationBlocked && <details style={{ marginTop: '20px', fontSize: '0.8rem', color: '#555', lineHeight: 1.7, textAlign: 'left' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 700, color: '#1a1a2e' }}>How to allow location on your phone</summary>
                <p><strong>iPhone / Safari:</strong> In iPhone Settings → Privacy &amp; Security → Location Services, allow Safari Websites while using the app. In Safari’s website settings, allow Location for this site, then return here and retry.</p>
                <p><strong>Android / Chrome:</strong> Allow location for Chrome in your phone settings. In Chrome → Settings → Site settings → Location, allow this website, then return here and retry.</p>
                <p>If you opened the link inside another app, open it in Safari or Chrome. You can also choose a London area above without sharing your location.</p>
              </details>}
            </div>
          )}

          {/* Results */}
          {status === 'done' && results.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', fontFamily: "'DM Sans', sans-serif", color: '#888' }}>
              {activeCategory === 'events' ? 'No recently verified events in these areas for this date. Check the full events page for updates.' : 'No area matches found. Try another category or London area.'}
              {activeCategory === 'events' && <p><Link href="/events" style={{ color: '#9b762a', fontWeight: 700 }}>View all events →</Link></p>}
            </div>
          )}

          {status === 'done' && results.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {results.map((item: any) => (
                <Link key={item.id} href={`/${DETAIL_PATHS[activeCategory]}/${encodeURIComponent(item.id)}`}
                  style={{ textDecoration: 'none', display: 'flex', gap: '12px', background: '#fff', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.07)', border: '1px solid rgba(201,168,76,0.12)', padding: '10px', alignItems: 'center' }}>
                  <NearMeThumbnail key={`${activeCategory}:${item.id}:${item.image || ''}`} item={item} collection={activeCategory} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', fontWeight: 700, color: '#1a1a2e' }}>{item.name}</div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', color: '#888', marginTop: '2px' }}>📍 {item.area || item.location}</div>
                    {item.category && <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.66rem', color: '#c9a84c', fontWeight: 600, marginTop: '2px' }}>{item.category}</div>}
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'center' as const, background: 'rgba(201,168,76,0.1)', borderRadius: '10px', padding: '6px 10px', minWidth: '50px' }}>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: item.dist !== null ? '1.1rem' : '0.75rem', fontWeight: 700, color: '#c9a84c' }}>{item.dist !== null ? `~${item.dist}km` : 'Area'}</div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.58rem', color: '#888' }}>{item.dist !== null ? 'away' : 'match'}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
