'use client';

import { useEffect, useState } from 'react';
import { fetchCollection } from '@/lib/firestore';
import { availableCategories, MIN_FILTER_RESULTS } from '@/lib/filterAvailability';
import { addCalendarDays, londonToday, occursInWindow } from '@/lib/eventDates';
import ListingStructuredData from '@/components/ListingStructuredData';

const CATEGORIES = ['All', 'Free Events', 'Food Markets', 'Markets', 'Live Music', 'Nightlife'];

function isHappeningNow(item: any): boolean {
  const today = londonToday();
  return occursInWindow(item, today, today);
}

// Time window filters: does the event fall within today / this weekend / this month?
function isThisWeek(item: any): boolean {
  const today = londonToday();
  return occursInWindow(item, today, addCalendarDays(today, 6));
}

function isThisWeekend(item: any): boolean {
  const today = londonToday();
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const saturday = addCalendarDays(today, (6 - weekday + 7) % 7);
  return occursInWindow(item, saturday, addCalendarDays(saturday, 1));
}

function isThisMonth(item: any): boolean {
  const today = londonToday();
  const end = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0)).toISOString().slice(0, 10);
  return occursInWindow(item, today, end);
}

const TIME_FILTERS = [
  { label: 'Today', value: 'today', test: isHappeningNow },
  { label: 'This Weekend', value: 'weekend', test: isThisWeekend },
  { label: 'This Week', value: 'week', test: isThisWeek },
  { label: 'This Month', value: 'month', test: isThisMonth },
];

export default function EventsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeTime, setActiveTime] = useState('today');

  const [loadFailed, setLoadFailed] = useState(false);

  const load = () => {
    setLoading(true);
    setLoadFailed(false);
    fetchCollection('events').then(data => {
      if (data && data.length > 0) {
        setItems(data);
      } else {
        setLoadFailed(true);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
  }, []);

  // A thin events feed may have fewer than five confirmed listings. Show the
  // honest count and keep Today available rather than implying old events recur.
  const availableTimes = TIME_FILTERS.filter(t => t.value === 'today' || items.some(t.test));
  const selectedTime = availableTimes.some(t => t.value === activeTime) ? activeTime : 'today';
  const timeFilterFn = TIME_FILTERS.find(t => t.value === selectedTime)?.test ?? isHappeningNow;
  const inTimeWindow = items.filter(timeFilterFn);
  const availableEventCategories = availableCategories(inTimeWindow, CATEGORIES, (e: any, cat) => e.category === cat);
  const selectedCategory = availableEventCategories.includes(activeCategory) ? activeCategory : 'All';
  const filtered = selectedCategory === 'All' ? inTimeWindow : inTimeWindow.filter((e: any) => e.category === selectedCategory);

  const todayLabel = new Date(`${londonToday()}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

  return (
    <main className="bg-[#f9f7f2] dark:bg-[#0d0d1a]" style={{ minHeight: '100vh' }}>
      <div style={{ background: '#1a1a2e', padding: '60px 20px 40px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', color: '#c9a84c', fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase' as const, marginBottom: '10px' }}>What's On</p>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 700, color: '#ffffff', margin: '0 0 14px' }}>What's Happening in London</h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '1rem', color: 'rgba(255,255,255,0.55)', marginBottom: '20px' }}>{todayLabel} — events, markets and things to do in London.</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
            {availableTimes.map(t => (
              <button key={t.value} onClick={() => { setActiveTime(t.value); setActiveCategory('All'); }} style={{ padding: '8px 18px', borderRadius: '40px', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: '0.8rem', fontWeight: 700, background: selectedTime === t.value ? '#c9a84c' : 'rgba(255,255,255,0.1)', color: selectedTime === t.value ? '#1a1a2e' : '#fff' }}>{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 20px 80px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {availableEventCategories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} style={{ padding: '8px 16px', borderRadius: '40px', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: '0.78rem', fontWeight: 600, background: selectedCategory === cat ? '#c9a84c' : 'rgba(26,26,46,0.08)', color: selectedCategory === cat ? '#1a1a2e' : '#666', transition: 'all 0.2s' }}>{cat}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(26,26,46,0.3)', fontFamily: "'DM Sans', sans-serif" }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(26,26,46,0.4)', fontFamily: "'DM Sans', sans-serif" }}>
            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📅</div>
            {loadFailed ? 'Events could not be loaded. Please try again later.' : `No confirmed events for ${selectedTime === 'today' ? 'today' : 'this period'} yet — check back soon.`}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {filtered.map((event: any) => (
              <div key={event.id} className="bg-white dark:bg-[#1a1a2e]" style={{ borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid rgba(201,168,76,0.12)' }}>
                <ListingStructuredData item={event} type="Event" section="events" />
                <div style={{ position: 'relative', height: '170px' }}>
                  <img src={event.image} alt={event.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {isHappeningNow(event) && <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(122,201,160,0.95)', color: '#1a1a2e', padding: '4px 12px', borderRadius: '20px', fontFamily: "'DM Sans', sans-serif", fontSize: '0.66rem', fontWeight: 700 }}>● ON TODAY</div>}
                  <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.55)', color: '#fff', padding: '4px 10px', borderRadius: '20px', fontFamily: "'DM Sans', sans-serif", fontSize: '0.64rem', fontWeight: 600 }}>{event.category}</div>
                </div>
                <div style={{ padding: '16px' }}>
                  <h3 className="text-navy dark:text-[#f9f7f2]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.2rem', fontWeight: 700, margin: '0 0 6px' }}>{event.name}</h3>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', color: '#888', marginBottom: '10px' }}>📍 {event.area}</p>
                  <p className="text-[#555] dark:text-[#bbb]" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.8rem', lineHeight: 1.6, marginBottom: '12px' }}>{event.description}</p>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {event.time && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(201,168,76,0.08)', borderRadius: '20px', padding: '4px 10px' }}>
                        <span style={{ fontSize: '0.8rem' }}>🕐</span>
                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', fontWeight: 600, color: '#c9a84c' }}>{event.time}</span>
                      </div>
                    )}
                    {event.price && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(201,168,76,0.08)', borderRadius: '20px', padding: '4px 10px' }}>
                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', fontWeight: 600, color: '#c9a84c' }}>{event.price}</span>
                      </div>
                    )}
                  </div>
                  {event.recurring && (
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.68rem', color: '#aaa', marginBottom: '10px' }}>🔁 {event.recurring}</p>
                  )}
                  {event.mapsUrl && (
                    <a href={event.mapsUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', color: '#c9a84c', fontFamily: "'DM Sans', sans-serif", fontSize: '0.76rem', fontWeight: 700, textDecoration: 'none' }}>📍 Get Directions →</a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
