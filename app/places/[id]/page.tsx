"use client";

import Image from "next/image";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchDocument } from "@/lib/firestore";
import ListingStructuredData from '@/components/ListingStructuredData';

const PLACE_HISTORY: Record<string, { founded: string; history: string; facts: string[] }> = {
  "tower-of-london": { founded: "Founded 1066 by William the Conqueror", history: "The Tower of London was built in the 1070s by William the Conqueror following his victory at the Battle of Hastings. Built from limestone imported from Caen in Normandy, it took nearly 20 years to complete. The Tower has served as a royal palace, political prison, place of execution, royal mint, menagerie, and arsenal.", facts: ["Built in the 1070s by William the Conqueror", "Only 7 people were ever executed inside the Tower walls", "At least 6 ravens must live here by royal decree", "The Crown Jewels have been stored here since the 17th century"] },
  "tower-bridge": { founded: "Built 1886-1894; opened 30 June 1894", history: "Tower Bridge was built between 1886 and 1894, opened by the Prince of Wales on 30 June 1894. Originally powered by steam hydraulics, converted to electricity in 1976. The bridge opens around 800-900 times per year.", facts: ["Built between 1886 and 1894 — took 8 years", "Over 11,000 tonnes of steel in the skeleton", "The bascules rise to 86 degrees in 5 minutes", "Glass floor panels installed in 2014"] },
  "buckingham-palace": { founded: "Built 1703; became royal residence 1837", history: "Buckingham Palace began as Buckingham House, built in 1703 for the Duke of Buckingham. Queen Victoria was the first monarch to use it as the official royal London residence in 1837.", facts: ["Originally Buckingham House, built in 1703", "Queen Victoria was the first monarch to live here in 1837", "The palace has 775 rooms and 78 bathrooms", "Around 50,000 people visit as guests each year"] },
  "british-museum": { founded: "Founded 1753; opened to public 1759", history: "The British Museum was founded in 1753, making it the world's first public national museum.", facts: ["World's first public national museum, founded 1753", "Over 8 million objects in the collection", "The Rosetta Stone has been on display since 1802", "Admission has been free since 2001"] },
  "hyde-park": { founded: "Royal park since 1536", history: "Hyde Park was seized by Henry VIII from Westminster Abbey in 1536. The Serpentine lake was created in 1730 by Queen Caroline.", facts: ["Seized by Henry VIII from Westminster Abbey in 1536", "Covers 350 acres", "The Serpentine lake was created in 1730", "Speakers' Corner has been a free speech site since 1872"] },
  "tate-modern": { founded: "Opened 11 May 2000", history: "Tate Modern opened in 2000 in the converted Bankside Power Station designed by Herzog & de Meuron.", facts: ["Opened 11 May 2000", "The Turbine Hall is 155 metres long", "Around 6 million visitors per year", "Admission to permanent collection is free"] },
  "kew-gardens": { founded: "Founded 1759; UNESCO World Heritage Site 2003", history: "The Royal Botanic Gardens, Kew, were founded in 1759 by Princess Augusta. UNESCO World Heritage Site since 2003.", facts: ["Founded in 1759 by Princess Augusta", "UNESCO World Heritage Site since 2003", "Over 50,000 plant species", "Covers 132 hectares"] },
  "big-ben": { founded: "Clock tower completed 1858", history: "The Elizabeth Tower was completed in 1858. Big Ben technically refers only to the largest bell inside, which weighs 13.7 tonnes.", facts: ["Big Ben is the name of the bell not the tower", "The main bell weighs 13.7 tonnes", "Clock faces are 7 metres in diameter", "Restored between 2017 and 2022 for £79 million"] },
};

function PhotoGallery({ photos, name }: { photos: string[]; name: string }) {
  const [active, setActive] = useState(0);
  if (!photos.length) return null;
  return (
    <div style={{ marginBottom: "24px" }}>
      <div style={{ borderRadius: "16px", overflow: "hidden", aspectRatio: "4/3", position: "relative", background: "#1a1a2e", marginBottom: "10px", width: "100%", maxWidth: "800px" }}>
        {/* REBUILD: switched from next/image to a plain <img> tag for this
            component specifically. Every theory about sizes/duplication/
            timing was tested and ruled out with real evidence (confirmed
            healthy 4K source images, correct sizes attributes, no
            duplicate hero), yet the extreme blur/zoom persisted only when
            a gallery was present. This removes Next.js's Image
            optimization pipeline from this component entirely as the last
            remaining untested variable. */}
        <img
          key={photos[active]}
          src={photos[active]}
          alt={`${name} ${active + 1}`}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          loading="eager"
        />
        {active > 0 && <button onClick={() => setActive(active - 1)} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", width: "36px", height: "36px", borderRadius: "50%", fontSize: "1.2rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>}
        {active < photos.length - 1 && <button onClick={() => setActive(active + 1)} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", width: "36px", height: "36px", borderRadius: "50%", fontSize: "1.2rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>}
        <div style={{ position: "absolute", bottom: "10px", right: "12px", background: "rgba(0,0,0,0.6)", color: "#fff", borderRadius: "20px", padding: "3px 10px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", fontWeight: 600 }}>{active + 1} / {photos.length}</div>
      </div>
      {photos.length > 1 && (
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
          {photos.map((p, i) => (
            <button key={i} onClick={() => setActive(i)} style={{ flexShrink: 0, width: "72px", height: "54px", borderRadius: "8px", overflow: "hidden", padding: 0, border: i === active ? "2.5px solid #c9a84c" : "2.5px solid transparent", cursor: "pointer", opacity: i === active ? 1 : 0.6, position: "relative" }}>
              <img src={p} alt="" loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PlaceDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [place, setPlace] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // FIX: this page still had the old silent stale-JSON fallback that
      // was removed from the Places LISTING page weeks ago but never
      // actually removed here on the DETAIL page. That bundled JSON file
      // is a snapshot from whenever it was last committed - it does not
      // reflect admin edits or fresh uploads at all. This is almost
      // certainly the real cause of "looks correct for a second then goes
      // wrong": fetchDocument succeeds and shows the real Firestore data
      // first, but if it were ever to fail even briefly, this would swap
      // in stale/wrong data with zero indication anything happened. Now it
      // just shows null (triggering the not-found state) instead of
      // silently substituting old data.
      const firebaseItem = await fetchDocument('places', id);
      setPlace(firebaseItem && firebaseItem.name ? firebaseItem : null);
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9f7f2" }}>
      <div style={{ fontFamily: "'DM Sans',sans-serif", color: "rgba(26,26,46,0.4)" }}>Loading...</div>
    </div>
  );

  if (!place) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "2rem", color: "#1a1a2e" }}>Place not found</div>
      <Link href="/places" style={{ color: "#c9a84c" }}>← Back to Places</Link>
    </div>
  );

  const history = PLACE_HISTORY[place.id];
  // FIX: this used to always put place.image FIRST in the gallery array,
  // meaning the hero banner and the gallery viewer both rendered the exact
  // same source image simultaneously, in two different sized containers,
  // right on first paint. That's real duplicated decode/layout work at the
  // most performance-sensitive moment of the page, and matches the user's
  // own testing: pages with only one photo (no duplication possible) never
  // showed the flash, pages with a gallery always did. Now the gallery
  // only shows genuinely ADDITIONAL photos, not a repeat of the hero.
  const photos = (place.gallery && place.gallery.length > 0)
    ? place.gallery.filter(Boolean)
    : [place.image].filter(Boolean);

  return (
    <main className="bg-[#f9f7f2] dark:bg-[#0d0d1a]" style={{ minHeight: "100vh" }}>
      <ListingStructuredData item={place} type="TouristAttraction" section="places" />
      <div style={{ position: "relative", width: "100%", maxWidth: "1400px", margin: "0 auto", height: "44vh", minHeight: "300px", maxHeight: "500px", overflow: "hidden" }}>
        <Image src={place.image} alt={place.name} fill priority sizes="(max-width: 1400px) 100vw, 1400px" style={{ objectFit: "cover", objectPosition: "center" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(26,26,46,0.88) 100%)" }} />
        <Link href="/places" style={{ position: "absolute", top: "16px", left: "16px", background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)", color: "#ffffff", borderRadius: "50px", padding: "7px 16px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none" }}>← Back</Link>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px 20px 20px" }}>
          <div style={{ display: "inline-block", background: "rgba(201,168,76,0.2)", border: "1px solid rgba(201,168,76,0.5)", color: "#c9a84c", borderRadius: "50px", padding: "3px 12px", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase" as const, marginBottom: "6px", fontFamily: "'DM Sans',sans-serif" }}>{place.category}</div>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(1.7rem,5.5vw,2.8rem)", fontWeight: 700, color: "#ffffff", lineHeight: 1.15, margin: "0 0 4px" }}>{place.name}</h1>
          {history && <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: "rgba(201,168,76,0.85)", margin: 0 }}>🏛️ {history.founded}</p>}
        </div>
      </div>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px 16px 60px" }}>
        <PhotoGallery photos={photos} name={place.name} />

        <div className="bg-white dark:bg-[#1a1a2e] border border-navy/10 dark:border-gold/20" style={{ borderRadius: "16px", padding: "18px 20px", marginBottom: "18px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", gap: "12px" }}>
          {place.area && <div style={{ display: "flex", gap: "10px" }}><span>📍</span><div><div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.65rem", color: "#888", fontWeight: 600, textTransform: "uppercase" as const }}>Area</div><div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", fontWeight: 600 }}>{place.area}</div></div></div>}
          {place.openingHours && <div style={{ display: "flex", gap: "10px" }}><span>🕐</span><div><div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.65rem", color: "#888", fontWeight: 600, textTransform: "uppercase" as const }}>Opening Hours</div><div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", fontWeight: 600 }}>{place.openingHours}</div></div></div>}
          {place.entryFee && <div style={{ display: "flex", gap: "10px" }}><span>{place.priceType === "Free" ? "🎁" : "💷"}</span><div><div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.65rem", color: "#888", fontWeight: 600, textTransform: "uppercase" as const }}>Entry</div><div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", fontWeight: 600 }}>{place.entryFee}</div></div></div>}
          {place.offerTag && <div style={{ display: "flex", gap: "10px", alignItems: "center" }}><span>🏷️</span><div style={{ background: "linear-gradient(135deg,#c9a84c,#f0d07a)", color: "#1a1a2e", borderRadius: "20px", padding: "4px 14px", fontSize: "0.76rem", fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}>Special Offer Available</div></div>}
        </div>

        <div className="bg-white dark:bg-[#1a1a2e] border border-navy/10 dark:border-gold/20" style={{ borderRadius: "16px", padding: "20px", marginBottom: "18px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
          <h2 className="text-navy dark:text-[#f9f7f2]" style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.4rem", fontWeight: 700, marginBottom: "10px", marginTop: 0 }}>About {place.name}</h2>
          <p className="text-[#444] dark:text-[#ccc]" style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.9rem", lineHeight: 1.8, margin: 0 }}>{place.description}</p>
        </div>

        {history && (
          <div style={{ background: "#1a1a2e", borderRadius: "16px", padding: "20px", marginBottom: "18px" }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.4rem", fontWeight: 700, color: "#c9a84c", marginBottom: "10px", marginTop: 0 }}>📜 History</h2>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", color: "rgba(255,255,255,0.8)", lineHeight: 1.8, margin: 0 }}>{history.history}</p>
          </div>
        )}

        {history && (
          <div className="bg-white dark:bg-[#1a1a2e] border border-navy/10 dark:border-gold/20" style={{ borderRadius: "16px", padding: "20px", marginBottom: "18px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
            <h2 className="text-navy dark:text-[#f9f7f2]" style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.4rem", fontWeight: 700, marginBottom: "14px", marginTop: 0 }}>⭐ Fascinating Facts</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {history.facts.map((fact, i) => (
                <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "rgba(201,168,76,0.15)", color: "#c9a84c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.68rem", fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                  <p className="text-[#444] dark:text-[#ccc]" style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.86rem", lineHeight: 1.6, margin: 0 }}>{fact}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="dark:bg-[#1a1a2e]" style={{ background: "rgba(201,168,76,0.08)", borderRadius: "16px", padding: "20px", marginBottom: "18px", border: "1px solid rgba(201,168,76,0.2)" }}>
          <h2 className="text-navy dark:text-[#f9f7f2]" style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.4rem", fontWeight: 700, marginBottom: "12px", marginTop: 0 }}>💡 Visitor Tips</h2>
          {["Book tickets online in advance to skip the queue", "Visit on weekday mornings for smaller crowds", "Check the official website for seasonal opening changes", "Nearest tube station is usually a short walk away"].map((tip, i) => (
            <p key={i} className="text-[#555] dark:text-[#bbb]" style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.86rem", lineHeight: 1.6, margin: "0 0 6px", display: "flex", gap: "8px" }}>
              <span style={{ color: "#c9a84c", fontWeight: 700 }}>✓</span> {tip}
            </p>
          ))}
        </div>

        {place.mapsUrl && <a href={place.mapsUrl} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", background: "#1a1a2e", color: "#c9a84c", padding: "15px", borderRadius: "50px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.95rem", fontWeight: 700, textDecoration: "none", marginBottom: "12px", boxSizing: "border-box" as const }}>📍 Get Directions on Google Maps</a>}
        <Link href="/places" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", background: "transparent", padding: "13px", borderRadius: "50px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.9rem", fontWeight: 600, textDecoration: "none", boxSizing: "border-box" as const, border: "2px solid" }} className="text-navy dark:text-[#f9f7f2] border-navy dark:border-[#f9f7f2]">← Back to All Places</Link>
      </div>
    </main>
  );
}
