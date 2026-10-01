"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchDocument } from "@/lib/firestore";
import ListingStructuredData from '@/components/ListingStructuredData';
import foodJson from "@/data/food.json";

function PhotoGallery({ photos, name }: { photos: string[]; name: string }) {
  const [active, setActive] = useState(0);
  if (!photos.length) return null;
  return (
    <div style={{ marginBottom: "24px" }}>
      <div style={{ borderRadius: "16px", overflow: "hidden", aspectRatio: "4/3", position: "relative", background: "#1a1a2e", marginBottom: "10px" }}>
        <img src={photos[active]} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        {active > 0 && <button onClick={() => setActive(active - 1)} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", width: "36px", height: "36px", borderRadius: "50%", fontSize: "1.2rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>}
        {active < photos.length - 1 && <button onClick={() => setActive(active + 1)} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", width: "36px", height: "36px", borderRadius: "50%", fontSize: "1.2rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>}
      </div>
    </div>
  );
}

export default function FoodDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const fbItem = await fetchDocument('food', id);
      if (fbItem && fbItem.name) { setItem(fbItem); }
      else { setItem((foodJson.items as any[]).find((f: any) => f.id === id) || null); }
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ fontFamily: "'DM Sans',sans-serif", color: "rgba(26,26,46,0.4)" }}>Loading...</div></div>;
  if (!item) return <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}><div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "2rem" }}>Not found</div><Link href="/food" style={{ color: "#c9a84c" }}>← Back</Link></div>;

  const photos = (item.gallery?.length > 0) ? [item.image, ...item.gallery].filter(Boolean) : [item.image].filter(Boolean);

  return (
    <main className="bg-[#f9f7f2] dark:bg-[#0d0d1a]" style={{ minHeight: "100vh" }}>
      <ListingStructuredData item={item} type="Restaurant" section="food" />
      <div style={{ position: "relative", height: "44vh", minHeight: "250px", overflow: "hidden" }}>
        <img src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(26,26,46,0.88) 100%)" }} />
        <Link href="/food" style={{ position: "absolute", top: "16px", left: "16px", background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)", color: "#ffffff", borderRadius: "50px", padding: "7px 16px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none" }}>← Back</Link>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px 20px 20px" }}>
          <div style={{ display: "inline-block", background: "rgba(201,168,76,0.2)", border: "1px solid rgba(201,168,76,0.5)", color: "#c9a84c", borderRadius: "50px", padding: "3px 12px", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase" as const, marginBottom: "6px", fontFamily: "'DM Sans',sans-serif" }}>{item.category}</div>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(1.7rem,5.5vw,2.8rem)", fontWeight: 700, color: "#ffffff", lineHeight: 1.15, margin: "0 0 4px" }}>{item.name}</h1>
          {item.cuisine && <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", color: "rgba(201,168,76,0.85)", margin: 0 }}>🍽️ {item.cuisine}</p>}
        </div>
      </div>
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px 16px 60px" }}>
        <PhotoGallery photos={photos} name={item.name} />
        <div className="bg-white dark:bg-[#1a1a2e] border border-navy/10 dark:border-gold/20" style={{ borderRadius: "16px", padding: "18px 20px", marginBottom: "18px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {item.area && <div style={{ display: "flex", gap: "10px" }}><span>📍</span><div><div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.65rem", color: "#888", fontWeight: 600, textTransform: "uppercase" as const }}>Area</div><div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", fontWeight: 600 }}>{item.area}</div></div></div>}
          {item.openingHours && <div style={{ display: "flex", gap: "10px" }}><span>🕐</span><div><div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.65rem", color: "#888", fontWeight: 600, textTransform: "uppercase" as const }}>Hours</div><div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", fontWeight: 600 }}>{item.openingHours}</div></div></div>}
          {item.priceRange && <div style={{ display: "flex", gap: "10px" }}><span>💷</span><div><div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.65rem", color: "#888", fontWeight: 600, textTransform: "uppercase" as const }}>Price</div><div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", fontWeight: 600 }}>{item.priceRange}</div></div></div>}
          {item.mustTry && <div style={{ display: "flex", gap: "10px" }}><span>⭐</span><div><div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.65rem", color: "#888", fontWeight: 600, textTransform: "uppercase" as const }}>Must Try</div><div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", fontWeight: 600 }}>{item.mustTry}</div></div></div>}
          {item.vibe && <div style={{ display: "flex", gap: "10px" }}><span>✨</span><div><div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.65rem", color: "#888", fontWeight: 600, textTransform: "uppercase" as const }}>Vibe</div><div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", fontWeight: 600 }}>{item.vibe}</div></div></div>}
        </div>
        <div className="bg-white dark:bg-[#1a1a2e] border border-navy/10 dark:border-gold/20" style={{ borderRadius: "16px", padding: "20px", marginBottom: "18px" }}>
          <h2 className="text-navy dark:text-[#f9f7f2]" style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.4rem", fontWeight: 700, marginBottom: "10px", marginTop: 0 }}>About {item.name}</h2>
          <p className="text-[#444] dark:text-[#ccc]" style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.9rem", lineHeight: 1.8, margin: 0 }}>{item.description}</p>
        </div>
        {item.mapsUrl && <a href={item.mapsUrl} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", background: "#1a1a2e", color: "#c9a84c", padding: "15px", borderRadius: "50px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.95rem", fontWeight: 700, textDecoration: "none", marginBottom: "12px", boxSizing: "border-box" as const }}>📍 Get Directions on Google Maps</a>}
        <Link href="/food" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", background: "transparent", padding: "13px", borderRadius: "50px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.9rem", fontWeight: 600, textDecoration: "none", boxSizing: "border-box" as const, border: "2px solid" }} className="text-navy dark:text-[#f9f7f2] border-navy dark:border-[#f9f7f2]">← Back to Food</Link>
      </div>
    </main>
  );
}
