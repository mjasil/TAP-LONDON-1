"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchDocument } from "@/lib/firestore";

export default function NightlifeDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const fbItem = await fetchDocument("nightlife", id);
      if (fbItem && fbItem.name) {
        setItem(fbItem);
      } else {
        setItem(null);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: "'DM Sans',sans-serif", color: "rgba(26,26,46,0.4)" }}>Loading...</div>
    </div>
  );

  if (!item) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "2rem" }}>Not found</div>
      <Link href="/nightlife" style={{ color: "#c9a84c" }}>← Back to Nightlife</Link>
    </div>
  );

  return (
    <main style={{ minHeight: "100vh" }} className="bg-[#f9f7f2] dark:bg-[#0d0d1a]">
      <div style={{ position: "relative", height: "44vh", minHeight: "250px", overflow: "hidden", background: "#1a1a2e" }}>
        {item.image && <img src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(26,26,46,0.9) 100%)" }} />
        <Link href="/nightlife" style={{ position: "absolute", top: "16px", left: "16px", background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: "50px", padding: "7px 16px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none" }}>← Back</Link>
        {item.openLate && (
          <div style={{ position: "absolute", top: "16px", right: "16px", background: "rgba(122,201,160,0.95)", color: "#1a1a2e", padding: "4px 12px", borderRadius: "20px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.68rem", fontWeight: 700 }}>🌙 OPEN LATE</div>
        )}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px 20px 20px" }}>
          <div style={{ display: "inline-block", background: "rgba(201,168,76,0.2)", border: "1px solid rgba(201,168,76,0.5)", color: "#c9a84c", borderRadius: "50px", padding: "3px 12px", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase" as const, marginBottom: "6px" }}>{item.category}</div>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(1.7rem,5.5vw,2.8rem)", fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>{item.name}</h1>
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", color: "rgba(201,168,76,0.85)", margin: 0 }}>{item.area}</p>
        </div>
      </div>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px 16px 60px" }}>
        <div className="bg-white dark:bg-[#1a1a2e]" style={{ borderRadius: "16px", padding: "18px 20px", marginBottom: "18px", border: "1px solid rgba(26,26,46,0.08)", display: "flex", flexDirection: "column", gap: "12px" }}>
          {[
            { icon: "📍", label: "Location", value: item.area },
            { icon: "🕐", label: "Opening Hours", value: item.openingHours },
            { icon: "💷", label: "Entry Fee", value: item.entryFee },
            { icon: "👔", label: "Dress Code", value: item.dressCode },
          ].filter(i => i.value).map(info => (
            <div key={info.label} style={{ display: "flex", gap: "10px" }}>
              <span style={{ fontSize: "1rem", flexShrink: 0 }}>{info.icon}</span>
              <div>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.65rem", color: "#888", fontWeight: 600, textTransform: "uppercase" as const }}>{info.label}</div>
                <div className="text-navy dark:text-[#f9f7f2]" style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.88rem", fontWeight: 600 }}>{info.value}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-[#1a1a2e]" style={{ borderRadius: "16px", padding: "20px", marginBottom: "18px", border: "1px solid rgba(26,26,46,0.08)" }}>
          <h2 className="text-navy dark:text-[#f9f7f2]" style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.4rem", fontWeight: 700, marginBottom: "10px" }}>About</h2>
          <p className="text-[#555] dark:text-[#bbb]" style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.9rem", lineHeight: 1.8, margin: 0 }}>{item.description}</p>
          {item.sourceName === 'Food Standards Agency' && item.sourceUrl && (
            <p className="mt-4 text-xs leading-6 text-[#777] dark:text-[#bbb]">
              Listed venue, not a TAP partner. Information from the{' '}
              <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="underline">Food Standards Agency register</a>
              {item.sourceAccessed ? `, accessed ${item.sourceAccessed}` : ''}. Check current details with the venue.
            </p>
          )}
        </div>

        {item.mapsUrl && (
          <a href={item.mapsUrl} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", background: "#1a1a2e", color: "#c9a84c", padding: "15px", borderRadius: "50px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.95rem", fontWeight: 700, textDecoration: "none", marginBottom: "12px", boxSizing: "border-box" as const }}>
            📍 Get Directions on Google Maps
          </a>
        )}
        <Link href="/nightlife" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", background: "transparent", color: "#1a1a2e", padding: "13px", borderRadius: "50px", border: "2px solid #1a1a2e", fontFamily: "'DM Sans',sans-serif", fontSize: "0.9rem", fontWeight: 600, textDecoration: "none", boxSizing: "border-box" as const }}>
          ← Back to Nightlife
        </Link>
      </div>
    </main>
  );
}
