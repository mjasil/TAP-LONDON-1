'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, Compass, MapPin, Sparkles } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import NearMe from '@/components/NearMe';
import LondonQuiz from '@/components/LondonQuiz';
import { fetchCollection } from '@/lib/firestore';

type FeaturedPlace = {
  id: string; name: string; area: string; description: string; entryFee: string; image: string;
};

const CATEGORIES = [
  { id: 'places', label: 'Places to explore', short: 'Places', caption: 'Landmarks, museums & hidden corners', href: '/places', image: 'https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg?auto=compress&cs=tinysrgb&w=1000' },
  { id: 'food', label: 'Eat & drink', short: 'Food', caption: 'Find your next London table', href: '/food', image: 'https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { id: 'kids', label: 'Family days out', short: 'Kids & Family', caption: 'Big days for little explorers', href: '/kids', image: 'https://images.pexels.com/photos/1148998/pexels-photo-1148998.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { id: 'nightlife', label: 'After dark', short: 'Nightlife', caption: 'Pubs, bars & live music', href: '/nightlife', image: 'https://images.pexels.com/photos/2034851/pexels-photo-2034851.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { id: 'shopping', label: 'Shopping streets', short: 'Shopping', caption: 'Markets, boutiques & more', href: '/shopping', image: 'https://images.pexels.com/photos/3965548/pexels-photo-3965548.jpeg?auto=compress&cs=tinysrgb&w=800' },
];

const MORE_LINKS = [
  { label: 'Hotels', detail: 'Find a place to stay', href: '/hotels' },
  { label: 'What’s on', detail: 'Events across the city', href: '/events' },
  { label: 'Hidden gems', detail: 'Go beyond the obvious', href: '/hidden-gems' },
  { label: 'Transport', detail: 'Get around with ease', href: '/transport' },
  { label: 'Offers', detail: 'Explore available deals', href: '/offers' },
  { label: 'Muslim guide', detail: 'Food and useful places', href: '/muslim' },
  { label: 'Sports', detail: 'Matches and venues', href: '/sports' },
  { label: 'Emergency help', detail: 'Useful numbers and advice', href: '/emergency' },
];

export default function HomePageClient({ heroImage, featuredPlaces }: { heroImage: string; featuredPlaces: FeaturedPlace[] }) {
  const [categoryImages, setCategoryImages] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    fetchCollection('siteImages').then(images => {
      if (!active || !images) return;
      const next: Record<string, string> = {};
      for (const image of images) {
        if (typeof image.url === 'string' && image.id?.startsWith('card-')) {
          next[image.id.slice(5)] = image.url;
        }
      }
      setCategoryImages(next);
    }).catch(() => { /* Built-in category imagery remains available. */ });
    return () => { active = false; };
  }, []);

  return (
    <div className="tap-home">
      <section className="tap-hero" aria-labelledby="tap-hero-title">
        <Image className="tap-hero-image" src={heroImage} alt="London skyline" fill priority unoptimized sizes="100vw" />
        <div className="tap-hero-shade" aria-hidden="true" />
        <div className="tap-container tap-hero-inner">
          <div className="tap-hero-copy">
            <p className="tap-eyebrow tap-eyebrow-light"><span className="tap-eyebrow-line" /> The city is yours to discover</p>
            <h1 id="tap-hero-title">Find your<br /><em>London.</em></h1>
            <p className="tap-hero-intro">The places, flavours and little discoveries that make a day here yours. Start exploring.</p>
            <div className="tap-search"><SearchBar /></div>
            <div className="tap-hero-actions">
              <NearMe />
              <Link href="/places" className="tap-hero-link">Explore places <ArrowUpRight size={17} aria-hidden="true" /></Link>
            </div>
          </div>
          <div className="tap-hero-caption" aria-hidden="true">LONDON <span>51° 30′ N</span></div>
        </div>
      </section>

      <nav className="tap-quick-nav" aria-label="Popular ways to explore">
        <div className="tap-container tap-quick-inner">
          <span className="tap-quick-label">Start with</span>
          <Link href="/places">Iconic places <ArrowUpRight size={15} /></Link>
          <Link href="/food">Food & drink <ArrowUpRight size={15} /></Link>
          <Link href="/kids">With kids <ArrowUpRight size={15} /></Link>
          <Link href="/nightlife">After dark <ArrowUpRight size={15} /></Link>
        </div>
      </nav>

      <section className="tap-section tap-discover" aria-labelledby="tap-discover-title">
        <div className="tap-container">
          <div className="tap-section-heading">
            <div><p className="tap-eyebrow">Explore by interest</p><h2 id="tap-discover-title">What kind of London<br className="tap-desktop-break" /> day are you after?</h2></div>
            <p>From the first landmark to the last stop of the night, find a place to begin.</p>
          </div>
          <div className="tap-category-grid">
            {CATEGORIES.map((category, index) => (
              <Link href={category.href} key={category.id} className={`tap-category tap-category-${index + 1}`}>
                <Image src={categoryImages[category.id] || category.image} alt="" fill sizes={index === 0 ? '(max-width: 760px) 100vw, 55vw' : '(max-width: 760px) 50vw, 28vw'} className="tap-category-image" />
                <span className="tap-category-tint" aria-hidden="true" />
                <span className="tap-category-top">{String(index + 1).padStart(2, '0')} / {category.short}</span>
                <span className="tap-category-bottom"><span><strong>{category.label}</strong><small>{category.caption}</small></span><ArrowUpRight aria-hidden="true" size={22} /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="tap-section tap-featured" aria-labelledby="tap-featured-title">
        <div className="tap-container">
          <div className="tap-section-heading tap-heading-inline">
            <div><p className="tap-eyebrow">A good place to start</p><h2 id="tap-featured-title">The London shortlist</h2></div>
            <Link href="/places" className="tap-text-link">See all places <ArrowRight size={18} aria-hidden="true" /></Link>
          </div>
          <div className="tap-featured-scroll" aria-label="Featured London places">
            {featuredPlaces.map(place => (
              <Link href={`/places/${place.id}`} className="tap-place-card" key={place.id}>
                <span className="tap-place-image"><Image src={place.image} alt={place.name} fill sizes="(max-width: 600px) 80vw, (max-width: 1000px) 42vw, 30vw" /></span>
                <span className="tap-place-content">
                  <span className="tap-place-area"><MapPin size={13} aria-hidden="true" />{place.area}</span>
                  <span className="tap-place-name">{place.name}</span>
                  <span className="tap-place-description">{place.description}</span>
                  <span className="tap-place-foot"><span>{place.entryFee}</span><ArrowUpRight size={19} aria-hidden="true" /></span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="tap-section tap-plan" aria-labelledby="tap-plan-title">
        <div className="tap-container tap-plan-layout">
          <div className="tap-plan-image">
            <Image src={featuredPlaces.find(place => place.id === 'covent-garden')?.image || heroImage} alt="Covent Garden in London" fill sizes="(max-width: 760px) 100vw, 50vw" />
            <span>Make room for the unexpected.</span>
          </div>
          <div className="tap-plan-copy">
            <p className="tap-eyebrow tap-eyebrow-light"><span className="tap-eyebrow-line" /> Plan your day</p>
            <h2 id="tap-plan-title">A city this big.<br /><em>A day that’s yours.</em></h2>
            <p>Choose the places you want to see and make a plan that fits your time, interests and budget.</p>
            <Link href="/trip-builder" className="tap-button">Build my London trip <ArrowUpRight size={18} aria-hidden="true" /></Link>
            <Link href="/hidden-gems" className="tap-plan-secondary">Or explore hidden gems <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>

      <section className="tap-section tap-more" aria-labelledby="tap-more-title">
        <div className="tap-container">
          <div className="tap-section-heading tap-heading-inline">
            <div><p className="tap-eyebrow">Keep exploring</p><h2 id="tap-more-title">More ways into London</h2></div>
            <Compass className="tap-heading-icon" size={36} strokeWidth={1.3} aria-hidden="true" />
          </div>
          <div className="tap-more-grid">
            {MORE_LINKS.map((item, index) => (
              <Link href={item.href} key={item.href} className="tap-more-link">
                <span className="tap-more-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="tap-more-text"><strong>{item.label}</strong><small>{item.detail}</small></span>
                <ArrowUpRight size={19} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="tap-quiz" aria-label="Personalise your London visit"><div className="tap-container"><LondonQuiz /></div></section>

      <section className="tap-nfc" aria-labelledby="tap-nfc-title">
        <div className="tap-container tap-nfc-inner">
          <span className="tap-nfc-mark"><Sparkles size={26} strokeWidth={1.4} aria-hidden="true" /></span>
          <div><p className="tap-eyebrow">TAP LONDON</p><h2 id="tap-nfc-title">A London guide, ready when you are.</h2><p>Tap your TAP LONDON souvenir to open the guide. No app or account needed.</p></div>
          <Link href="/places" className="tap-text-link">Explore London <ArrowRight size={18} aria-hidden="true" /></Link>
        </div>
      </section>
    </div>
  );
}
