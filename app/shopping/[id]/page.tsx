"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchDocument } from "@/lib/firestore";

export default function ShoppingDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setActivePhoto(0);
    fetchDocument("shopping", id)
      .then(result => {
        if (!active) return;
        setItem(result?.name ? result : null);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setItem(null);
        setLoading(false);
      });
    return () => { active = false; };
  }, [id]);

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: "'DM Sans',sans-serif", color: "rgba(26,26,46,0.4)", fontSize: "0.9rem" }}>Loading...</div>
    </div>
  );

  if (!item) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "2rem", color: "#1a1a2e" }}>Not found</div>
      <Link href="/shopping" style={{ color: "#c9a84c", fontFamily: "'DM Sans',sans-serif" }}>← Back to Shopping</Link>
    </div>
  );

  const photos: string[] = Array.from(new Set([item.image, ...(Array.isArray(item.gallery) ? item.gallery : [])].filter(Boolean)));
  const subShops: any[] = Array.isArray(item.subShops) ? item.subShops : [];

  return (
    <main className="bg-[#f9f7f2] dark:bg-[#0d0d1a]" style={{ minHeight: "100vh" }}>

      {/* ─── HERO ─── */}
      <div style={{ position: "relative", height: "52vh", minHeight: "300px", overflow: "hidden", background: "#1a1a2e" }}>
        {photos.length > 0 && (
          <img src={photos[activePhoto]} alt={item.name}
            style={{ width: "100%", height: "100%", objectFit: "cover", transition: "opacity 0.4s" }} />
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(26,26,46,0.92) 100%)" }} />

        <Link href="/shopping" style={{
          position: "absolute", top: "16px", left: "16px",
          background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.25)", color: "#fff",
          borderRadius: "50px", padding: "8px 16px",
          fontFamily: "'DM Sans',sans-serif", fontSize: "0.8rem", fontWeight: 600,
          textDecoration: "none"
        }}>← Shopping</Link>

        {photos.length > 1 && (
          <div style={{
            position: "absolute", top: "16px", right: "16px",
            background: "rgba(0,0,0,0.5)", color: "#fff",
            borderRadius: "50px", padding: "6px 12px",
            fontFamily: "'DM Sans',sans-serif", fontSize: "0.74rem", fontWeight: 600
          }}>📷 {photos.length} photos</div>
        )}

        <div style={{ position: "absolute", bottom: "28px", left: "24px", right: "24px" }}>
          <div style={{
            display: "inline-block", background: "rgba(201,168,76,0.9)", color: "#1a1a2e",
            borderRadius: "50px", padding: "4px 14px", marginBottom: "10px",
            fontFamily: "'DM Sans',sans-serif", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase" as const
          }}>{item.section || item.type || "Shopping"}</div>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(2rem,6vw,3.2rem)", fontWeight: 700, color: "#fff", lineHeight: 1.1, margin: 0 }}>
            {item.name}
          </h1>
          {item.location && (
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", color: "rgba(255,255,255,0.6)", marginTop: "8px" }}>
              📍 {item.location}
            </p>
          )}
        </div>
      </div>

      {/* ─── GALLERY THUMBNAILS ─── */}
      {photos.length > 1 && (
        <div style={{ background: "#1a1a2e", padding: "12px 20px", display: "flex", gap: "8px", overflowX: "auto" }}>
          {photos.map((photo, i) => (
            <button key={i} onClick={() => setActivePhoto(i)} style={{
              flexShrink: 0, width: "64px", height: "64px", borderRadius: "8px", overflow: "hidden",
              border: activePhoto === i ? "2px solid #c9a84c" : "2px solid transparent",
              cursor: "pointer", padding: 0, background: "none"
            }}>
              <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </button>
          ))}
        </div>
      )}

      {/* ─── CONTENT ─── */}
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "32px 20px 80px" }}>

        {/* Transport */}
        {item.nearestStation && (
          <div className="bg-white dark:bg-[#1a1a2e]" style={{
            borderRadius: "14px", padding: "16px 20px", marginBottom: "20px",
            border: "1px solid rgba(201,168,76,0.2)", display: "flex", alignItems: "center", gap: "14px"
          }}>
            <span style={{ fontSize: "1.8rem" }}>🚇</span>
            <div>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.68rem", color: "#888", textTransform: "uppercase" as const, letterSpacing: "1px", marginBottom: "2px" }}>Nearest Station</div>
              <div className="text-navy dark:text-[#f9f7f2]" style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.95rem", fontWeight: 700 }}>{item.nearestStation}</div>
            </div>
            {item.mapsUrl && (
              <a href={item.mapsUrl} target="_blank" rel="noreferrer"
                style={{ marginLeft: "auto", background: "#1a1a2e", color: "#c9a84c", borderRadius: "10px", padding: "10px 16px", fontFamily: "'DM Sans',sans-serif", fontSize: "0.8rem", fontWeight: 700, textDecoration: "none", flexShrink: 0 }}>
                📍 Directions
              </a>
            )}
          </div>
        )}

        {/* Info row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px", marginBottom: "24px" }}>
          {item.openingHours && (
            <div className="bg-white dark:bg-[#1a1a2e]" style={{ borderRadius: "12px", padding: "14px", border: "1px solid rgba(201,168,76,0.1)" }}>
              <div style={{ fontSize: "1.2rem", marginBottom: "4px" }}>🕐</div>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.65rem", color: "#888", textTransform: "uppercase" as const, letterSpacing: "1px" }}>Hours</div>
              <div className="text-navy dark:text-[#f9f7f2]" style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", fontWeight: 600, marginTop: "3px" }}>{item.openingHours}</div>
            </div>
          )}
          {item.type && (
            <div className="bg-white dark:bg-[#1a1a2e]" style={{ borderRadius: "12px", padding: "14px", border: "1px solid rgba(201,168,76,0.1)" }}>
              <div style={{ fontSize: "1.2rem", marginBottom: "4px" }}>🛍️</div>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.65rem", color: "#888", textTransform: "uppercase" as const, letterSpacing: "1px" }}>Type</div>
              <div className="text-navy dark:text-[#f9f7f2]" style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", fontWeight: 600, marginTop: "3px" }}>{item.type}</div>
            </div>
          )}
          {subShops.length > 0 && (
            <div className="bg-white dark:bg-[#1a1a2e]" style={{ borderRadius: "12px", padding: "14px", border: "1px solid rgba(201,168,76,0.1)" }}>
              <div style={{ fontSize: "1.2rem", marginBottom: "4px" }}>🏪</div>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.65rem", color: "#888", textTransform: "uppercase" as const, letterSpacing: "1px" }}>Shops</div>
              <div className="text-navy dark:text-[#f9f7f2]" style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.78rem", fontWeight: 600, marginTop: "3px" }}>{subShops.length} stores</div>
            </div>
          )}
        </div>

        {/* Description */}
        {item.description && (
          <div className="bg-white dark:bg-[#1a1a2e]" style={{ borderRadius: "14px", padding: "20px", marginBottom: "28px", border: "1px solid rgba(201,168,76,0.1)" }}>
            <h2 className="text-navy dark:text-[#f9f7f2]" style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.3rem", fontWeight: 700, marginBottom: "10px" }}>About</h2>
            <p className="text-[#555] dark:text-[#bbb]" style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.9rem", lineHeight: 1.8, margin: 0 }}>{item.description}</p>
            {item.highlights && (
              <div style={{ marginTop: "14px", padding: "12px 16px", background: "rgba(201,168,76,0.08)", borderRadius: "10px", borderLeft: "3px solid #c9a84c" }}>
                <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.72rem", fontWeight: 700, color: "#c9a84c", textTransform: "uppercase" as const, letterSpacing: "1px" }}>Key Stores: </span>
                <span className="text-[#555] dark:text-[#bbb]" style={{ fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem" }}>{item.highlights}</span>
              </div>
            )}
          </div>
        )}

        {/* ─── SUB SHOPS — BIG CARDS ─── */}
        {subShops.length > 0 && (
          <div>
            <h2 className="text-navy dark:text-[#f9f7f2]" style={{
              fontFamily: "'Cormorant Garamond',serif", fontSize: "1.8rem",
              fontWeight: 700, marginBottom: "18px"
            }}>
              🏪 Shops in {item.name}
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "18px" }}>
              {subShops.map((shop: any, i: number) => (
                <div key={i} className="bg-white dark:bg-[#1a1a2e]" style={{
                  borderRadius: "16px", overflow: "hidden",
                  border: "1px solid rgba(201,168,76,0.12)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.07)"
                }}>
                  {/* Shop image */}
                  <div style={{ position: "relative", height: "160px", background: "#1a1a2e", overflow: "hidden" }}>
                    {shop.image ? (
                      <img src={shop.image} alt={shop.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{
                        width: "100%", height: "100%",
                        background: "linear-gradient(135deg, rgba(201,168,76,0.15), rgba(26,26,46,0.8))",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "2.5rem"
                      }}>🛍️</div>
                    )}
                    {/* Overlay gradient */}
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)" }} />
                    {/* Type badge */}
                    <div style={{
                      position: "absolute", top: "10px", left: "10px",
                      background: "rgba(201,168,76,0.92)", color: "#1a1a2e",
                      borderRadius: "50px", padding: "3px 12px",
                      fontFamily: "'DM Sans',sans-serif", fontSize: "0.65rem", fontWeight: 700,
                      letterSpacing: "0.5px", textTransform: "uppercase" as const
                    }}>{shop.type}</div>
                  </div>

                  {/* Shop info */}
                  <div style={{ padding: "16px" }}>
                    <h3 className="text-navy dark:text-[#f9f7f2]" style={{
                      fontFamily: "'Cormorant Garamond',serif", fontSize: "1.25rem",
                      fontWeight: 700, margin: "0 0 8px"
                    }}>{shop.name}</h3>

                    {shop.note && (
                      <p className="text-[#666] dark:text-[#aaa]" style={{
                        fontFamily: "'DM Sans',sans-serif", fontSize: "0.8rem",
                        lineHeight: 1.6, margin: "0 0 12px"
                      }}>{shop.note}</p>
                    )}

                    {/* Opening hours */}
                    {shop.openingHours && (
                      <div style={{
                        display: "flex", alignItems: "center", gap: "6px",
                        background: "rgba(201,168,76,0.08)", borderRadius: "8px",
                        padding: "8px 12px", marginBottom: "12px"
                      }}>
                        <span style={{ fontSize: "0.85rem" }}>🕐</span>
                        <span style={{
                          fontFamily: "'DM Sans',sans-serif", fontSize: "0.74rem",
                          fontWeight: 600, color: "#c9a84c"
                        }}>{shop.openingHours}</span>
                      </div>
                    )}

                    {/* Get Directions button */}
                    {shop.mapsUrl && (
                      <a href={shop.mapsUrl} target="_blank" rel="noreferrer" style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                        background: "#1a1a2e", color: "#c9a84c",
                        borderRadius: "10px", padding: "12px",
                        fontFamily: "'DM Sans',sans-serif", fontSize: "0.82rem", fontWeight: 700,
                        textDecoration: "none", width: "100%", boxSizing: "border-box" as const
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                        </svg>
                        Get Directions
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
