'use client';

import { useEffect, useState } from 'react';
import sportsData from '@/data/sports.json';
import { availableCategories } from '@/lib/filterAvailability';

const SPORTS = ['All', 'Football', 'Cricket', 'Tennis', 'Boxing & Events'];

export default function SportsPage() {
  const [activeSport, setActiveSport] = useState('All');
  const venues = (sportsData as any).venues || [];
  const leagues = (sportsData as any).leagues || [];

  const filteredVenues = venues.filter((v: any) => activeSport === 'All' || v.sport === activeSport || (activeSport === 'Boxing & Events' && v.sport === 'Boxing & Events'));

  return (
    <main className="bg-[#f9f7f2] dark:bg-[#0d0d1a]" style={{ minHeight: '100vh' }}>
      <div style={{ background: '#1a1a2e', padding: '60px 20px 40px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', color: '#c9a84c', fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase' as const, marginBottom: '10px' }}>Sports</p>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 700, color: '#ffffff', margin: '0 0 14px' }}>London Sports</h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '1rem', color: 'rgba(255,255,255,0.55)' }}>Football, cricket, tennis, boxing and more — London is one of the world's great sports cities.</p>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 20px 80px' }}>
        {/* Sport filters */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', flexWrap: 'wrap' }}>
          {availableCategories([...venues, ...leagues], SPORTS, (item: any, sport) => item.sport === sport).map(sport => (
            <button key={sport} onClick={() => setActiveSport(sport)} style={{ padding: '8px 18px', borderRadius: '40px', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: '0.82rem', fontWeight: 600, background: activeSport === sport ? '#c9a84c' : 'rgba(26,26,46,0.08)', color: activeSport === sport ? '#1a1a2e' : '#666', transition: 'all 0.2s' }}>{sport}</button>
          ))}
        </div>

        {/* Leagues */}
        <div style={{ marginBottom: '40px' }}>
          <h2 className="text-navy dark:text-[#f9f7f2]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.6rem', fontWeight: 700, marginBottom: '16px' }}>Leagues & Tournaments</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
            {leagues.filter((l: any) => activeSport === 'All' || l.sport === activeSport).map((league: any) => (
              <div key={league.id} className="bg-white dark:bg-[#1a1a2e]" style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(201,168,76,0.15)', display: 'flex', gap: '0' }}>
                <div style={{ width: '80px', flexShrink: 0 }}>
                  <img src={league.image} alt={league.name} style={{ width: '100%', height: '100%', objectFit: 'cover', minHeight: '80px' }} />
                </div>
                <div style={{ padding: '12px' }}>
                  <div className="text-navy dark:text-[#f9f7f2]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', fontWeight: 700 }}>{league.name}</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.68rem', color: '#888', margin: '3px 0' }}>{league.season}</div>
                  {league.londonTeams && <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.66rem', color: '#c9a84c' }}>{league.londonTeams.join(' · ')}</div>}
                  <a href={league.ticketsUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: '6px', background: 'rgba(201,168,76,0.1)', color: '#c9a84c', padding: '3px 10px', borderRadius: '20px', fontFamily: "'DM Sans', sans-serif", fontSize: '0.66rem', fontWeight: 700, textDecoration: 'none' }}>Get Tickets →</a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Venues */}
        <h2 className="text-navy dark:text-[#f9f7f2]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.6rem', fontWeight: 700, marginBottom: '16px' }}>London Sports Venues</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {filteredVenues.map((venue: any) => (
            <div key={venue.id} className="bg-white dark:bg-[#1a1a2e]" style={{ borderRadius: '14px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid rgba(201,168,76,0.1)' }}>
              <div style={{ position: 'relative', height: '160px' }}>
                <img src={venue.image} alt={venue.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(201,168,76,0.9)', color: '#1a1a2e', padding: '3px 10px', borderRadius: '20px', fontFamily: "'DM Sans', sans-serif", fontSize: '0.68rem', fontWeight: 700 }}>{venue.sport}</div>
              </div>
              <div style={{ padding: '14px' }}>
                <h3 className="text-navy dark:text-[#f9f7f2]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.15rem', fontWeight: 700, margin: '0 0 4px' }}>{venue.name}</h3>
                {venue.team && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.72rem', color: '#c9a84c', fontWeight: 600, marginBottom: '4px' }}>🏟️ {venue.team}</p>}
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', color: '#888', marginBottom: '8px' }}>📍 {venue.area} · Capacity: {venue.capacity}</p>
                <p className="text-[#555] dark:text-[#bbb]" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.78rem', lineHeight: 1.6, marginBottom: '10px' }}>{venue.description}</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', color: '#888', marginBottom: '8px' }}>🚇 {venue.nearestStation}</p>
                {venue.nearbyPubs?.length > 0 && (
                  <div>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.68rem', color: '#888', marginBottom: '4px' }}>🍺 Nearby pubs:</p>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {venue.nearbyPubs.map((pub: string) => <span key={pub} style={{ background: 'rgba(201,168,76,0.08)', color: '#c9a84c', borderRadius: '20px', padding: '2px 8px', fontSize: '0.62rem', fontFamily: "'DM Sans', sans-serif" }}>{pub}</span>)}
                    </div>
                  </div>
                )}
                <a href={venue.mapsUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: '10px', color: '#c9a84c', fontFamily: "'DM Sans', sans-serif", fontSize: '0.76rem', fontWeight: 600, textDecoration: 'none' }}>📍 Get Directions →</a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
