'use client';

import { useState, useCallback } from 'react';
import { fetchCollection } from '@/lib/firestore';

const CATEGORIES = [
  { label: 'Food', icon: '🍽️', collection: 'food' },
  { label: 'Places', icon: '🏛️', collection: 'places' },
  { label: 'Nightlife', icon: '🌙', collection: 'nightlife' },
  { label: 'Hotels', icon: '🏨', collection: 'hotels' },
  { label: 'Kids', icon: '👨\u200d👩\u200d👧', collection: 'kids' },
  { label: 'Hidden Gems', icon: '💎', collection: 'hiddenGems' },
  { label: 'Shopping', icon: '🛍️', collection: 'shopping' },
];

const AREA_COORDS: Record<string, [number, number]> = {
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
};

function getAreaCoords(area: string): [number, number] | null {
  if (!area) return null;
  const lower = area.toLowerCase();
  for (const [key, coords] of Object.entries(AREA_COORDS)) {
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

// Fallback for when browser geolocation fails or is denied - notably iOS
// Safari, which can be unreliable about even showing the permission prompt
// in some cases regardless of the site's own code. This estimates location
// from the visitor's IP address instead - far less precise (city-level, not
// street-level) but needs no permission prompt at all, so it works even
// when GPS geolocation can't. Uses a free, keyless public API.
async function getLocationFromIP(): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
      return { lat: data.latitude, lng: data.longitude };
    }
    return null;
  } catch {
    return null;
  }
}

export default function NearMe() {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('food');
  const [status, setStatus] = useState<'idle'|'requesting'|'loading'|'done'|'error'>('idle');
  const [results, setResults] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [userPos, setUserPos] = useState<{lat:number;lng:number}|null>(null);
  const [isApproxLocation, setIsApproxLocation] = useState(false);

  const findNearby = useCallback(async (collection: string, pos: {lat:number;lng:number}) => {
    setStatus('loading');
    setResults([]);
    try {
      const items = await fetchCollection(collection) || [];
      // Items whose area couldn't be matched to a known London area used to be
      // silently dropped entirely (marked as 999km and filtered out) - meaning
      // any item with an area name not in the ~40-entry AREA_COORDS list never
      // showed up in Near Me at all, even though it's a real London location.
      // Now unmatched items are still shown, just sorted after matched ones,
      // so Near Me never comes back empty just because of a naming mismatch.
      const withDist = items.map((item: any) => {
        const latitude = Number(item.latitude ?? item.lat);
        const longitude = Number(item.longitude ?? item.lng);
        const exact = Number.isFinite(latitude) && Number.isFinite(longitude) && latitude > 50 && latitude < 52 && longitude > -1 && longitude < 1;
        const coords: [number, number] | null = exact ? [latitude, longitude] : getAreaCoords(item.area || item.location || '');
        const dist = coords ? Math.round(distKm(pos.lat, pos.lng, coords[0], coords[1]) * 10) / 10 : null;
        return { ...item, dist, approximateDistance: !exact || isApproxLocation };
      });

      const matched = withDist.filter((i: any) => i.dist !== null).sort((a: any, b: any) => a.dist - b.dist);
      const unmatched = withDist.filter((i: any) => i.dist === null);

      setResults([...matched, ...unmatched].slice(0, 12));
      setStatus('done');
    } catch {
      setErrorMsg('Could not load places. Please try again.');
      setStatus('error');
    }
  }, [isApproxLocation]);

  const requestLocation = useCallback((collection: string) => {
    setActiveCategory(collection);
    setStatus('requesting');
    setErrorMsg('');

    if (!navigator.geolocation) {
      setErrorMsg('Location is not supported on this device.');
      setStatus('error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPos(p);
        findNearby(collection, p);
      },
      (err) => {
        if (err.code === 1) {
          setErrorMsg('Location access was denied. Please allow location in your browser settings and try again.');
        } else if (err.code === 2) {
          setErrorMsg('Could not detect your location. Please try again.');
        } else {
          setErrorMsg('Location request timed out. Please try again.');
        }
        setStatus('error');
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 }
    );
  }, [findNearby]);

  const handleOpen = () => {
    if (!navigator.geolocation) {
      setOpen(true);
      setStatus('error');
      setErrorMsg('Location is not supported on this device.');
      return;
    }

    // FIX: getCurrentPosition must be the very first thing that runs in this
    // click handler, with ZERO state updates (setOpen/setStatus/etc.) before it.
    // The previous version called setOpen/setStatus/setActiveCategory BEFORE
    // getCurrentPosition, which schedules a React re-render in between the
    // click event and the geolocation call. On strict mobile browsers (notably
    // Chrome/Safari on iOS and some Android WebViews), that broken timing can
    // cause the browser to no longer treat the call as coming from a trusted
    // user gesture, which can silently produce PERMISSION_DENIED even when the
    // site already has location permission granted. Calling it truly first,
    // synchronously, fixes this.
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setOpen(true);
        setActiveCategory('food');
        setUserPos(p);
        findNearby('food', p);
      },
      async (err) => {
        setOpen(true);
        setActiveCategory('food');
        // Precise GPS failed/denied - try the IP-based fallback before
        // giving up entirely. This is what makes Near Me still work on
        // iOS Safari sessions where the permission prompt doesn't behave
        // reliably, without requiring the person to change any settings.
        const ipPos = await getLocationFromIP();
        if (ipPos) {
          setUserPos(ipPos);
          setIsApproxLocation(true);
          findNearby('food', ipPos);
          return;
        }
        if (err.code === 1) {
          setErrorMsg('Location access was denied. Please go to your browser Settings → Site permissions → Location → Allow.');
        } else {
          setErrorMsg('Could not get your location. Please try again.');
        }
        setStatus('error');
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
    // Show the panel immediately in a loading state while the browser's
    // permission prompt / GPS lookup is in progress, without delaying the
    // getCurrentPosition call itself.
    setOpen(true);
    setStatus('requesting');
  };

  const handleCategoryChange = (col: string) => {
    if (userPos) {
      setActiveCategory(col);
      findNearby(col, userPos);
      return;
    }
    // No position yet - same fix as handleOpen: call getCurrentPosition first,
    // before any state updates, to keep the trusted user-gesture chain intact.
    if (!navigator.geolocation) {
      setActiveCategory(col);
      setErrorMsg('Location is not supported on this device.');
      setStatus('error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setActiveCategory(col);
        setUserPos(p);
        findNearby(col, p);
      },
      async () => {
        setActiveCategory(col);
        const ipPos = await getLocationFromIP();
        if (ipPos) {
          setUserPos(ipPos);
          setIsApproxLocation(true);
          findNearby(col, ipPos);
          return;
        }
        setErrorMsg('Could not get your location. Please allow location access and try again.');
        setStatus('error');
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
    setActiveCategory(col);
    setStatus('requesting');
  };

  if (!open) return (
    <button
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

  return (
    <div
      onClick={() => setOpen(false)}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9998, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    >
      <div onClick={e => e.stopPropagation()} style={{ background: '#f9f7f2', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '620px', maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: '#1a1a2e', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>📍 Near Me</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>
              {status === 'requesting' && 'Allow location access to continue...'}
              {status === 'loading' && 'Finding nearest places...'}
              {status === 'done' && userPos && (isApproxLocation ? 'Using approximate location — enable precise location for better results' : 'Location found — showing closest results')}
              {status === 'error' && 'Location error'}
              {status === 'idle' && 'Finding your location...'}
            </div>
          </div>
          <button onClick={() => setOpen(false)} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', width: '34px', height: '34px', borderRadius: '50%', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
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

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

          {/* Requesting permission */}
          {status === 'requesting' && (
            <div style={{ textAlign: 'center', padding: '48px 20px', fontFamily: "'DM Sans', sans-serif" }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📍</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1a1a2e', marginBottom: '8px' }}>Allow Location Access</div>
              <div style={{ fontSize: '0.82rem', color: '#888', lineHeight: 1.6, maxWidth: '280px', margin: '0 auto' }}>
                A permission dialog should appear. Tap <strong>"Allow"</strong> to find places near you.
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
              <div style={{ color: '#e55', marginBottom: '12px', fontSize: '0.88rem', fontWeight: 600 }}>{errorMsg}</div>
              <button onClick={() => requestLocation(activeCategory)} style={{ background: '#1a1a2e', color: '#c9a84c', border: 'none', borderRadius: '10px', padding: '12px 24px', fontFamily: "'DM Sans', sans-serif", fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer' }}>
                Try Again
              </button>
              <div style={{ marginTop: '16px', fontSize: '0.74rem', color: '#aaa', lineHeight: 1.6 }}>
                If denied, go to your browser settings → Site Settings → Location → Allow for this site
              </div>
            </div>
          )}

          {/* Results */}
          {status === 'done' && results.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', fontFamily: "'DM Sans', sans-serif", color: '#888' }}>
              No nearby results found. Try a different category.
            </div>
          )}

          {status === 'done' && results.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {results.map((item: any) => (
                <a key={item.id} href={item.mapsUrl || '#'} target="_blank" rel="noreferrer"
                  style={{ textDecoration: 'none', display: 'flex', gap: '12px', background: '#fff', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.07)', border: '1px solid rgba(201,168,76,0.12)', padding: '10px', alignItems: 'center' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, background: '#eee' }}>
                    {item.image && <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', fontWeight: 700, color: '#1a1a2e' }}>{item.name}</div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', color: '#888', marginTop: '2px' }}>📍 {item.area || item.location}</div>
                    {item.category && <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.66rem', color: '#c9a84c', fontWeight: 600, marginTop: '2px' }}>{item.category}</div>}
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'center' as const, background: 'rgba(201,168,76,0.1)', borderRadius: '10px', padding: '6px 10px', minWidth: '50px' }}>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: item.dist !== null ? '1.1rem' : '0.75rem', fontWeight: 700, color: '#c9a84c' }}>{item.dist !== null ? `${item.approximateDistance || isApproxLocation ? '~' : ''}${item.dist}km` : 'London'}</div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.58rem', color: '#888' }}>{item.dist !== null && (item.approximateDistance || isApproxLocation) ? 'approx.' : 'away'}</div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
