'use client';

import Link from 'next/link';
import NextImage from 'next/image';
import { useEffect, useState, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { FadeUp, SlideLeft, SlideRight } from '@/components/ScrollAnimation';
import SearchBar from '@/components/SearchBar';
import NearMe from '@/components/NearMe';
import LondonQuiz from '@/components/LondonQuiz';
import { fetchDocument, fetchCollection } from '@/lib/firestore';

const DEFAULT_HERO = 'https://images.pexels.com/photos/672532/pexels-photo-672532.jpeg?auto=compress&cs=tinysrgb&w=1920';

const MAIN_CARDS = [
  { id: 'places',       label: 'Best Places',    sub: 'Attractions, hidden gems & photo spots', href: '/places',       image: 'https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg?auto=compress&cs=tinysrgb&w=800',    tag: 'Places' },
  { id: 'food',         label: 'Food & Drinks',  sub: 'Restaurants, halal food & local eats',   href: '/food',         image: 'https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=800',   tag: 'Food' },
  { id: 'shopping',     label: 'Shopping',        sub: 'Luxury streets, markets & boutiques',   href: '/shopping',     image: 'https://images.pexels.com/photos/3965548/pexels-photo-3965548.jpeg?auto=compress&cs=tinysrgb&w=800',   tag: 'Shopping' },
  { id: 'nightlife',    label: 'Nightlife',       sub: 'Rooftop bars, clubs & live music',      href: '/nightlife',    image: 'https://images.pexels.com/photos/2034851/pexels-photo-2034851.jpeg?auto=compress&cs=tinysrgb&w=800',   tag: 'Nightlife' },
  { id: 'hotels',       label: 'Hotels',          sub: 'Budget to luxury, find your stay',     href: '/hotels',       image: 'https://images.pexels.com/photos/261102/pexels-photo-261102.jpeg?auto=compress&cs=tinysrgb&w=800',    tag: 'Hotels' },
  { id: 'transport',    label: 'Transport',       sub: 'Tube, bus, taxi & travel tips',         href: '/transport',    image: 'https://images.pexels.com/photos/5765/london-street-landmark-double-decker.jpg?auto=compress&cs=tinysrgb&w=800', tag: 'Places' },
  { id: 'kids',         label: 'Kids & Family',   sub: 'Attractions, parks & family fun',       href: '/kids',         image: 'https://images.pexels.com/photos/1148998/pexels-photo-1148998.jpeg?auto=compress&cs=tinysrgb&w=800',   tag: 'Places' },
  { id: 'muslim',       label: 'Muslim Guide',    sub: 'Halal food, mosques & prayer rooms',    href: '/muslim',       image: 'https://images.pexels.com/photos/3874832/pexels-photo-3874832.jpeg?auto=compress&cs=tinysrgb&w=800',   tag: 'Food' },
  { id: 'emergency',    label: 'Emergency Help',  sub: 'Safety tips, scam alerts & numbers',   href: '/emergency',    image: 'https://images.pexels.com/photos/63901/pexels-photo-63901.jpeg?auto=compress&cs=tinysrgb&w=800',      tag: 'Places' },
];

const DISCOVER_CARDS = [
  { label: 'Offers & Deals',  sub: 'Best London deals right now',     href: '/offers',       icon: '🏷️',  color: '#e8a020' },
  { label: 'Sports',          sub: 'Football, cricket, boxing & more', href: '/sports',       icon: '⚽',  color: '#2d9e4f' },
  { label: 'Hidden Gems',     sub: 'Secret spots only locals know',   href: '/hidden-gems',  icon: '💎',  color: '#7c5cbf' },
  { label: 'Trending Now',    sub: 'Viral restaurants & hotspots',    href: '/trending',     icon: '🔥',  color: '#e55' },
  { label: 'Guides',          sub: 'Curated themed London lists',     href: '/guides',       icon: '📖',  color: '#5ab0e5' },
  { label: 'Happening Today', sub: 'Live events and markets now',     href: '/events',       icon: '📅',  color: '#7ac9a0' },
];

const TABS = ['All', 'Places', 'Food', 'Shopping', 'Nightlife', 'Hotels'];
const HOW_IT_WORKS = [
  { title: 'Tap the souvenir', desc: 'Hold your phone near any TAP LONDON NFC product.', step: '01' },
  { title: 'Open the guide',   desc: 'Your browser opens instantly. No app, no login.',  step: '02' },
  { title: 'Choose a section', desc: 'Find places, food, shopping, hotels in seconds.',  step: '03' },
  { title: 'Enjoy London',     desc: 'Real directions, trusted tips, halal guides.',      step: '04' },
];
const STATS = [
  { number: '300+', label: 'Curated Places' },
  { number: '200+', label: 'Restaurants' },
  { number: '12',   label: 'Languages' },
  { number: '24/7', label: 'AI Guide' },
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('All');
  const [heroImage, setHeroImage] = useState<string | null>(null);
  const [cards, setCards] = useState(MAIN_CARDS);
  const [heroReady, setHeroReady] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '25%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);

  useEffect(() => {
    const loadImages = async () => {
      // FIX: this used to fire ~10 separate Firestore document requests at
      // once (1 hero + 1 per card in MAIN_CARDS via Promise.all), all hitting
      // the API in the same instant on every homepage load. That request
      // burst was very likely a real contributor to the 429 "Too Many
      // Requests" errors seen in the browser console. Fetching the whole
      // siteImages collection in ONE request and picking out what's needed
      // client-side avoids that burst entirely.
      const allImages = await fetchCollection('siteImages');
      const imageMap = new Map((allImages || []).map((doc: any) => [doc.id, doc.url]));

      const url = imageMap.get('hero') || DEFAULT_HERO;
      const img = new Image();
      img.onload = () => { setHeroImage(url); setHeroReady(true); };
      img.onerror = () => { setHeroImage(DEFAULT_HERO); setHeroReady(true); };
      img.src = url;

      const updatedCards = MAIN_CARDS.map((card) => {
        const cardUrl = imageMap.get('card-' + card.id);
        return cardUrl ? { ...card, image: cardUrl } : card;
      });
      setCards(updatedCards);
    };
    loadImages();
  }, []);

  const filtered = cards.filter(c => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Hotels') return c.tag === 'Hotels';
    return c.tag === activeTab;
  });

  return (
    <main style={{ overflowX: 'hidden', width: '100%' }}>

      {/* HERO */}
      <section ref={heroRef} style={{ position: 'relative', height: '92vh', minHeight: '560px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#0d0d1a' }}>
        {heroImage && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: heroReady ? 1 : 0 }} transition={{ duration: 0.6 }}
            style={{ position: 'absolute', inset: '-10%', y: heroY, scale: heroScale, backgroundImage: `url('${heroImage}')`, backgroundSize: 'cover', backgroundPosition: 'center 30%', zIndex: 0 }}
          />
        )}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(to bottom, rgba(10,10,24,0.45) 0%, rgba(10,10,24,0.3) 40%, rgba(10,10,24,0.82) 100%)' }} />

        <motion.div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: '860px', padding: '0 20px', boxSizing: 'border-box' as const, textAlign: 'center', opacity: heroOpacity }}
          initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}>

          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(201,168,76,0.13)', border: '1px solid rgba(201,168,76,0.35)', color: '#c9a84c', borderRadius: '40px', padding: '6px 18px', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '2px', marginBottom: '24px', textTransform: 'uppercase' as const, backdropFilter: 'blur(10px)', fontFamily: "'DM Sans', sans-serif" }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#c9a84c', boxShadow: '0 0 8px #c9a84c' }} />
            London's Smart Travel Guide
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32, duration: 0.9 }}
            style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(2.8rem, 9vw, 6.2rem)', fontWeight: 700, lineHeight: 1, margin: '0 0 20px', letterSpacing: '-1px' }}>
            <span style={{ color: '#ffffff' }}>Discover </span>
            <span style={{ background: 'linear-gradient(130deg, #c9a84c 0%, #f5d97a 50%, #b8882e 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>London</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.8 }}
            style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 'clamp(0.9rem, 2vw, 1.08rem)', color: 'rgba(255,255,255,0.62)', marginBottom: '36px', lineHeight: 1.6 }}>
            Food, hotels, nightlife, sports, hidden gems, everything London in one place.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.7 }} style={{ marginBottom: '20px', width: '100%' }}>
            <SearchBar />
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.72, duration: 0.6 }} style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
            {[{ label: 'Clubs', href: '/nightlife' }, { label: 'Kids Entertainment', href: '/kids' }, { label: 'Rooftop Bar', href: '/nightlife' }, { label: 'Hidden Gems', href: '/hidden-gems' }].map(item => (
              <Link key={item.label} href={item.href} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)', textDecoration: 'none', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '40px', padding: '5px 14px' }}>{item.label}</Link>
            ))}
          </motion.div>

          {/* Near Me button */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85, duration: 0.6 }} style={{ display: 'flex', justifyContent: 'center' }}>
            <NearMe />
          </motion.div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4, duration: 1 }} style={{ position: 'absolute', bottom: '28px', left: '50%', transform: 'translateX(-50%)', zIndex: 2 }}>
          <motion.div animate={{ scaleY: [1, 0.2, 1] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }} style={{ width: '1px', height: '36px', background: 'linear-gradient(to bottom, rgba(201,168,76,0.7), transparent)' }} />
        </motion.div>
      </section>

      {/* STATS */}
      <section style={{ background: '#1a1a2e', borderBottom: '1px solid rgba(201,168,76,0.1)', width: '100%' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {STATS.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07, duration: 0.45 }}
              style={{ textAlign: 'center', padding: '26px 8px', borderRight: i < 3 ? '1px solid rgba(201,168,76,0.08)' : 'none' }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(1.4rem, 4vw, 2.4rem)', fontWeight: 700, color: '#c9a84c', lineHeight: 1 }}>{s.number}</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 'clamp(0.55rem, 1.3vw, 0.65rem)', color: 'rgba(249,247,242,0.35)', marginTop: '4px', letterSpacing: '1.2px', textTransform: 'uppercase' as const }}>{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* AI ITINERARY BUILDER - entry card */}
      <section style={{ padding: '48px 20px', width: '100%', boxSizing: 'border-box' as const }}>
        <Link href="/trip-builder" style={{ textDecoration: 'none', display: 'block', width: '100%' }}>
          <div style={{
            maxWidth: '1100px', margin: '0 auto', position: 'relative', overflow: 'hidden',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #26203d 45%, #1a1a2e 80%, #221c33 100%)',
            borderRadius: '22px', padding: 'clamp(28px, 5vw, 52px)', cursor: 'pointer',
            border: '1px solid rgba(201,168,76,0.25)',
          }}>
            <div style={{
              position: 'absolute', top: '-50%', right: '-12%', width: '480px', height: '480px', borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(201,168,76,0.22), transparent 65%)',
            }} />
            <div style={{
              position: 'absolute', bottom: '-45%', left: '-6%', width: '320px', height: '320px', borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(201,168,76,0.08), transparent 70%)',
            }} />
            <div className="itinerary-entry-inner" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: '20px' }}>
              <div className="itinerary-entry-text" style={{ textAlign: 'left' as const }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px', fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.68rem', color: '#c9a84c', letterSpacing: '2.5px', textTransform: 'uppercase' as const,
                  border: '1px solid rgba(201,168,76,0.3)', borderRadius: '40px', padding: '5px 14px', marginBottom: '16px',
                }}>✦ AI Itinerary Builder</div>
                <h2 style={{
                  fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: '#fff',
                  fontSize: 'clamp(1.6rem, 4vw, 2.6rem)', margin: '0 0 10px', lineHeight: 1.1,
                }}>Build My London Trip</h2>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.92rem', color: 'rgba(255,255,255,0.5)', maxWidth: '440px', margin: '0 auto' }}>
                  Days, budget, interests, hotel area: get a full day-by-day schedule in seconds.
                </p>
              </div>
              <div style={{
                background: 'linear-gradient(135deg,#c9a84c,#e8c46f)', color: '#1a1a2e', padding: '15px 30px',
                borderRadius: '12px', fontFamily: "'DM Sans', sans-serif", fontSize: '0.9rem', fontWeight: 700,
                whiteSpace: 'nowrap' as const, boxShadow: '0 8px 24px rgba(201,168,76,0.25)',
              }}>Plan My Trip →</div>
            </div>
            <style>{`
              @media (max-width: 640px) {
                .itinerary-entry-inner { flex-direction: column !important; justify-content: center !important; }
                .itinerary-entry-text { text-align: center !important; }
                .itinerary-entry-text p { margin-left: auto !important; margin-right: auto !important; }
              }
            `}</style>
          </div>
        </Link>
      </section>

      {/* LONDON QUIZ */}
      <section style={{ background: '#1a1a2e', padding: '60px 20px', width: '100%', boxSizing: 'border-box' as const, borderTop: '1px solid rgba(201,168,76,0.1)' }}>
        <LondonQuiz />
      </section>

      {/* THINGS TO DO IN LONDON — banner leading to Hidden Gems */}
      <section style={{ padding: '48px 20px 0', width: '100%', boxSizing: 'border-box' as const }} className="bg-[#f9f7f2] dark:bg-[#0d0d1a]">
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <Link href="/hidden-gems" style={{ textDecoration: 'none', display: 'block' }}>
            <motion.div
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.25 }}
              style={{
                position: 'relative', borderRadius: '22px', overflow: 'hidden',
                minHeight: '220px', display: 'flex', alignItems: 'center',
                background: 'linear-gradient(120deg, #1a1a2e 0%, #2d2d4e 60%, #3a2f1a 100%)',
                padding: '36px 32px', cursor: 'pointer',
              }}
            >
              <div style={{ position: 'absolute', inset: 0, opacity: 0.15, backgroundImage: "url('https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&q=60')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div style={{ position: 'relative', zIndex: 1, maxWidth: '600px' }}>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.68rem', color: '#c9a84c', fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase' as const, marginBottom: '10px' }}>💎 Curated by London Locals</p>
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(1.6rem, 4.5vw, 2.6rem)', fontWeight: 700, color: '#ffffff', margin: '0 0 12px', lineHeight: 1.15 }}>Things to Do in London: Beyond the Guidebook</h2>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.92rem', color: 'rgba(255,255,255,0.6)', marginBottom: '20px', lineHeight: 1.6 }}>Secret gardens, underrated museums, hidden bars and Instagram spots most tourists never find, the places locals actually love.</p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: '50px', padding: '10px 22px', color: '#c9a84c', fontFamily: "'DM Sans', sans-serif", fontSize: '0.84rem', fontWeight: 700 }}>
                  Discover Hidden Gems
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
              </div>
            </motion.div>
          </Link>

          <Link href="/events" style={{ textDecoration: 'none', display: 'block', marginTop: '16px' }}>
            <motion.div
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.25 }}
              style={{
                position: 'relative', borderRadius: '18px', overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: '16px',
                background: 'linear-gradient(120deg, #7a2838 0%, #9c3347 100%)',
                padding: '22px 28px', cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{
                  width: '10px', height: '10px', borderRadius: '50%', background: '#ff5a5a',
                  boxShadow: '0 0 0 0 rgba(255,90,90,0.7)', animation: 'tap-pulse 1.6s infinite',
                }} />
                <div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.66rem', color: '#ffd3d3', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' as const, marginBottom: '4px' }}>Live Today</div>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(1.15rem, 3vw, 1.5rem)', fontWeight: 700, color: '#fff' }}>What's Happening in London Right Now</div>
                </div>
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '10px 20px',
                borderRadius: '10px', fontFamily: "'DM Sans', sans-serif", fontSize: '0.82rem', fontWeight: 700,
                whiteSpace: 'nowrap' as const,
              }}>See What's On →</div>
            </motion.div>
          </Link>
          <style>{`
            @keyframes tap-pulse {
              0% { box-shadow: 0 0 0 0 rgba(255,90,90,0.6); }
              70% { box-shadow: 0 0 0 8px rgba(255,90,90,0); }
              100% { box-shadow: 0 0 0 0 rgba(255,90,90,0); }
            }
          `}</style>
        </div>
      </section>

      {/* DISCOVER MORE — new sections */}
      <section className="bg-[#f9f7f2] dark:bg-[#0d0d1a]" style={{ padding: '48px 20px 0', width: '100%', boxSizing: 'border-box' as const }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <FadeUp>
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.66rem', color: '#c9a84c', fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase' as const, marginBottom: '6px' }}>Discover More</p>
              <h2 className="text-navy dark:text-[#f9f7f2]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 700, margin: 0 }}>More of London</h2>
            </div>
          </FadeUp>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginBottom: '48px' }}>
            {DISCOVER_CARDS.map((card, i) => (
              <motion.div key={card.href} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}>
                <Link href={card.href} style={{ textDecoration: 'none', display: 'block' }}>
                  <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }} className="bg-white dark:bg-[#1a1a2e]"
                    style={{ borderRadius: '14px', padding: '20px', border: '1px solid rgba(201,168,76,0.12)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', cursor: 'pointer' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '10px' }}>{card.icon}</div>
                    <div className="text-navy dark:text-[#f9f7f2]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem', fontWeight: 700, marginBottom: '4px' }}>{card.label}</div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.72rem', color: '#888' }}>{card.sub}</div>
                    <div style={{ marginTop: '12px', color: card.color, fontFamily: "'DM Sans', sans-serif", fontSize: '0.76rem', fontWeight: 700 }}>Explore →</div>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* MAIN EXPLORE GRID */}
      <section className="bg-[#f9f7f2] dark:bg-[#0d0d1a]" style={{ padding: '0 20px 88px', width: '100%', boxSizing: 'border-box' as const }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <FadeUp>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
              <div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.66rem', color: '#c9a84c', fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase' as const, marginBottom: '6px' }}>Explore</p>
                <h2 className="text-navy dark:text-[#f9f7f2]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 700, margin: 0 }}>Everything in London</h2>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {TABS.map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.78rem', fontWeight: 600, padding: '8px 18px', borderRadius: '40px', cursor: 'pointer', border: 'none', background: activeTab === tab ? '#c9a84c' : 'transparent', color: activeTab === tab ? '#1a1a2e' : '#888', outline: activeTab === tab ? 'none' : '1px solid rgba(150,150,150,0.25)', transition: 'all 0.2s ease' }}>{tab}</button>
                ))}
              </div>
            </div>
          </FadeUp>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
            {filtered.map((card, i) => (
              <motion.div key={card.id} initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.05 }}>
                <Link href={card.href} style={{ textDecoration: 'none', display: 'block' }}>
                  <motion.div whileHover={{ y: -6 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', height: '230px', boxShadow: '0 2px 16px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
                    <NextImage src={card.image} alt={card.label} fill sizes="(max-width: 768px) 100vw, 33vw" style={{ objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,10,22,0.88) 0%, rgba(10,10,22,0.1) 55%, transparent 100%)' }} />
                    <div style={{ position: 'absolute', top: '14px', left: '14px', background: 'rgba(201,168,76,0.9)', color: '#1a1a2e', padding: '3px 10px', borderRadius: '40px', fontFamily: "'DM Sans', sans-serif", fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' as const }}>{card.tag}</div>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 18px' }}>
                      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.3rem', fontWeight: 700, color: '#ffffff', marginBottom: '5px', lineHeight: 1.15 }}>{card.label}</div>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>{card.sub}</div>
                    </div>
                    <div style={{ position: 'absolute', bottom: '20px', right: '18px', width: '32px', height: '32px', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ background: '#1a1a2e', padding: '88px 20px', width: '100%', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <FadeUp>
            <div style={{ textAlign: 'center', marginBottom: '60px' }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.66rem', color: '#c9a84c', fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase' as const, marginBottom: '10px' }}>How it works</p>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(1.9rem, 4.5vw, 3rem)', color: '#ffffff', fontWeight: 700, margin: 0 }}>A souvenir that opens the city</h2>
            </div>
          </FadeUp>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1px', background: 'rgba(201,168,76,0.07)' }}>
            {HOW_IT_WORKS.map((item, i) => (
              <motion.div key={item.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: i * 0.09 }} style={{ background: '#1a1a2e', padding: '40px 24px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '2.8rem', color: 'rgba(201,168,76,0.1)', fontWeight: 700, lineHeight: 1 }}>{item.step}</div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem', fontWeight: 700, color: '#c9a84c', margin: '10px 0 10px' }}>{item.title}</div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.76rem', color: 'rgba(255,255,255,0.44)', lineHeight: 1.7, margin: 0 }}>{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section className="bg-[#f9f7f2] dark:bg-[#0d0d1a]" style={{ padding: '88px 20px', width: '100%', boxSizing: 'border-box' as const }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '64px', alignItems: 'center' }}>
          <div>
            <SlideLeft>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.66rem', color: '#c9a84c', fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase' as const, marginBottom: '12px' }}>About</p>
              <h2 className="text-navy dark:text-[#f9f7f2]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(1.8rem, 4vw, 2.9rem)', fontWeight: 700, margin: '0 0 20px', lineHeight: 1.15 }}>Built for every<br />London moment</h2>
              <div style={{ width: '36px', height: '2px', background: '#c9a84c', marginBottom: '22px', borderRadius: '2px' }} />
              <p className="text-ink/70 dark:text-[#f9f7f2]/55" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.91rem', lineHeight: 1.85, marginBottom: '32px' }}>TAP LONDON is the daily discovery platform for food, hotels, sports, offers and hidden gems across London. Tap, explore and enjoy, no app needed.</p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <Link href="/places" style={{ background: '#1a1a2e', color: '#c9a84c', padding: '13px 28px', borderRadius: '8px', fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '0.84rem', textDecoration: 'none' }}>Explore London</Link>
                <Link href="/emergency" className="text-navy dark:text-cream" style={{ background: 'transparent', padding: '13px 28px', borderRadius: '8px', border: '1.5px solid currentColor', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.84rem', textDecoration: 'none' }}>Emergency Help</Link>
              </div>
            </SlideLeft>
          </div>
          <SlideRight delay={0.15}>
            <div style={{ position: 'relative', height: '420px' }}>
              <motion.div initial={{ opacity: 0, x: 32, rotate: 3 }} whileInView={{ opacity: 1, x: 0, rotate: 3 }} viewport={{ once: true }} transition={{ duration: 0.65, delay: 0.1 }} style={{ position: 'absolute', right: 0, top: 0, width: '73%', height: '285px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 56px rgba(0,0,0,0.16)' }}>
                <NextImage src="https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg?auto=compress&cs=tinysrgb&w=600" alt="London" fill sizes="(max-width: 768px) 50vw, 300px" style={{ objectFit: 'cover' }} />
              </motion.div>
              <motion.div initial={{ opacity: 0, x: -24, rotate: -2 }} whileInView={{ opacity: 1, x: 0, rotate: -2 }} viewport={{ once: true }} transition={{ duration: 0.65, delay: 0.22 }} style={{ position: 'absolute', left: 0, bottom: 0, width: '62%', height: '228px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 56px rgba(0,0,0,0.16)', border: '3px solid #f9f7f2' }}>
                <NextImage src="https://images.pexels.com/photos/672532/pexels-photo-672532.jpeg?auto=compress&cs=tinysrgb&w=600" alt="Tower Bridge" fill sizes="(max-width: 768px) 50vw, 300px" style={{ objectFit: 'cover' }} />
              </motion.div>
            </div>
          </SlideRight>
        </div>
      </section>
    </main>
  );
}
