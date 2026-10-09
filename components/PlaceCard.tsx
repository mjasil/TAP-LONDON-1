"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Clock, MapPin, Navigation, Tag } from "lucide-react";
import { useState } from "react";
import { isFullyFree } from '@/lib/entryFee';
import { publicListingStatus } from '@/lib/nightlifeListing';

export type CardItem = {
  id: string;
  name: string;
  category?: string;
  section?: string;
  area?: string;
  location?: string;
  cuisine?: string;
  type?: string;
  priceRange?: string;
  icon?: string;
  image?: string;
  imageIsIllustrative?: boolean;
  imageCredit?: string;
  imageLicense?: string;
  halal?: boolean;
  verifiedHalal?: boolean;
  description: string;
  openingHours?: string;
  entryFee?: string;
  priceType?: string;
  mapsUrl?: string;
  offer?: boolean;
  offerText?: string;
  mustTry?: string;
  vibe?: string;
  opinion?: string;
  tags?: string[];
  nearestStation?: string;
  phone?: string;
  recommended?: boolean;
  familyFriendlyBadge?: boolean;
  listingStatus?: string;
  partnerConfirmed?: boolean;
  musicType?: string;
};

const VIBE_COLORS: Record<string, { bg: string; text: string }> = {
  "Date night":  { bg: "rgba(220,38,38,0.1)",   text: "#dc2626" },
  "Hidden gem":  { bg: "rgba(124,58,237,0.1)",   text: "#7c3aed" },
  "Quick bite":  { bg: "rgba(37,99,235,0.1)",    text: "#2563eb" },
  "Aesthetic":   { bg: "rgba(236,72,153,0.1)",   text: "#ec4899" },
  "Family":      { bg: "rgba(22,163,74,0.1)",    text: "#16a34a" },
};

type PlaceCardProps = {
  item: CardItem;
  mode?: "place" | "food" | "shopping" | "kids" | "nightlife" | "muslim" | "emergency";
};

export default function PlaceCard({ item, mode = "place" }: PlaceCardProps) {
  const [imageFailed, setImageFailed] = useState(false);

  // Defensive guard: an item without a valid id would otherwise produce a
  // broken link like /places/undefined or /places/ (no id at all) - this
  // was seen live where clicking certain cards led to a blank page at a
  // trailing-slash URL. Placed after the hooks above (React requires hooks
  // to run unconditionally on every render) so it can't break the build.
  if (!item?.id) return null;
  const category = item.category ?? item.section ?? item.type ?? "London";
  const area = item.area ?? item.location ?? "London";
  // Determine paid/free defensively: don't trust priceType alone (it can be
  // missing or wrong in Firestore). Fall back to reading entryFee text properly —
  // e.g. "Exterior free; exhibition adult £14.50" mentions "free" but also has a
  // real price, so it must NOT be treated as fully free.
  const paid = !isFullyFree(item);
  const callNumber = mode === 'emergency' && item.phone && /^[+\d\s()-]+$/.test(item.phone)
    ? item.phone.replace(/[^+\d]/g, '') : null;
  const fallbackIcon = mode === "food" ? "🍽️" : mode === "shopping" ? "🛍️" : "📍";
  const icon = item.icon ?? fallbackIcon;
  const vibeStyle = item.vibe ? VIBE_COLORS[item.vibe] : null;
  const nightlifeStatus = mode === 'nightlife' ? publicListingStatus(item) : 'Listed';

  const card = (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      whileHover={{ y: -5 }}
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-navy/10 bg-white shadow-sm transition hover:border-gold hover:shadow-lift dark:border-gold/20 dark:bg-navy/80"
    >
      <div className="relative h-[200px] overflow-hidden rounded-t-lg bg-navy">
        {item.image && !imageFailed ? (
          <Image
            src={item.image}
            alt={item.imageIsIllustrative ? 'Illustrative nightlife scene' : `${item.name} in London`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="rounded-t-lg object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 rounded-t-lg bg-[linear-gradient(135deg,#1a1a2e_0%,#26345f_48%,#c9a84c_100%)]" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.48))]" />

        {item.imageIsIllustrative && item.image && !imageFailed && (
          <span className="absolute bottom-3 right-3 rounded-full bg-navy/80 px-2.5 py-1 text-[10px] font-semibold text-white">
            Illustrative photo
          </span>
        )}
        {item.imageCredit && item.image && !imageFailed && (
          <span className="absolute bottom-3 right-3 max-w-[65%] truncate rounded bg-navy/75 px-2 py-1 text-[10px] text-white" title={`Photo: ${item.imageCredit} · ${item.imageLicense || 'see details'}`}>
            Photo: {item.imageCredit}{item.imageLicense ? ` · ${item.imageLicense}` : ''}
          </span>
        )}

        <div className="absolute left-4 top-4 rounded-full bg-white/92 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-navy shadow-sm dark:bg-navy dark:text-gold dark:border dark:border-gold/30">
          {category}
        </div>

        {item.recommended && (
          <div style={{
            position: "absolute", right: "12px", top: "12px",
            display: "flex", alignItems: "center", gap: "4px",
            background: "linear-gradient(135deg, #c9a84c, #f0d07a)",
            color: "#1a1a2e", borderRadius: "50px", padding: "4px 10px",
            fontSize: "0.64rem", fontWeight: 800,
            fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.3px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
          }}>
            ⭐ TAP LONDON PICK
          </div>
        )}

        {nightlifeStatus !== 'Listed' && (
          <span className="absolute right-3 top-12 rounded-full bg-gold px-2.5 py-1 text-[10px] font-bold text-navy">✓ {nightlifeStatus}</span>
        )}

        {item.familyFriendlyBadge && (
          <div style={{
            position: "absolute", right: "12px", top: item.recommended ? "42px" : "12px",
            display: "flex", alignItems: "center", gap: "4px",
            background: "rgba(122,201,160,0.95)",
            color: "#1a1a2e", borderRadius: "50px", padding: "4px 10px",
            fontSize: "0.64rem", fontWeight: 800,
            fontFamily: "'DM Sans', sans-serif",
          }}>
            👨‍👩‍👧 FAMILY FRIENDLY
          </div>
        )}

        {item.offer && (
          <div style={{
            position: "absolute", bottom: "12px", left: "12px",
            background: "#c9a84c", color: "#1a1a2e",
            borderRadius: "50px", padding: "4px 12px",
            fontSize: "0.68rem", fontWeight: 800,
            fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.5px",
          }}>
            {item.offerText ?? "OFFER"}
          </div>
        )}


      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          {area && (
            <span className="inline-flex items-center gap-1 rounded-full bg-cream px-3 py-1 text-xs font-bold text-navy dark:bg-white/10 dark:text-cream">
              <MapPin size={13} />{area}
            </span>
          )}
          {item.priceRange && (
            <span className="rounded-full bg-navy px-3 py-1 text-xs font-bold text-white dark:bg-gold dark:text-navy">
              {item.priceRange}
            </span>
          )}
          {mode === 'nightlife' && item.musicType && (
            <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-bold text-navy dark:text-cream">🎵 {item.musicType}</span>
          )}
          {mode === "place" && item.priceType !== 'Check venue' && (
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${paid ? "bg-navy text-white dark:bg-white/20 dark:text-cream" : "bg-gold text-navy"}`}>
              {paid ? "Paid" : "Free"}
            </span>
          )}
          {item.vibe && vibeStyle && (
            <span style={{
              background: vibeStyle.bg, color: vibeStyle.text,
              borderRadius: "50px", padding: "3px 10px",
              fontSize: "0.68rem", fontWeight: 700,
              fontFamily: "'DM Sans', sans-serif",
            }}>
              {item.vibe}
            </span>
          )}
        </div>

        <h2 className="mt-4 font-heading text-2xl font-bold leading-tight text-navy dark:text-cream sm:text-[1.65rem]">
          {item.name}
        </h2>

        {item.cuisine || item.type ? (
          <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-gold">
            <Tag size={15} />{item.cuisine ?? item.type}
          </p>
        ) : null}

        {item.opinion && (
          <p className="mt-2 text-sm font-semibold italic" style={{ color: "#c9a84c" }}>
            &ldquo;{item.opinion}&rdquo;
          </p>
        )}

        <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/70 dark:text-cream/70">
          {item.description}
        </p>

        {item.mustTry && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-gold/10 px-3 py-2">
            <span style={{ fontSize: "0.9rem" }}>🔥</span>
            <div>
              <span className="text-xs font-bold uppercase tracking-wide text-gold">Must try </span>
              <span className="text-xs text-ink/70 dark:text-cream/70">{item.mustTry}</span>
            </div>
          </div>
        )}

        <div className="mt-4 grid gap-2 text-sm text-ink/68 dark:text-cream/60">
          {item.openingHours && (
            <p className="flex gap-2">
              <Clock size={16} className="mt-0.5 shrink-0 text-gold" />
              {item.openingHours}
            </p>
          )}
          {item.nearestStation && (
            <p className="flex gap-2">
              <span style={{ fontSize: '0.9rem' }}>🚇</span>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.78rem', color: 'rgba(26,26,46,0.6)' }}>
                {item.nearestStation}
              </span>
            </p>
          )}
          {item.entryFee && (
            <p className="font-semibold text-navy/75 dark:text-cream/70">{item.entryFee}</p>
          )}
        </div>

        <div className="mt-auto pt-5">
          {callNumber && (
            <a href={`tel:${callNumber}`} className="mb-2 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-red-700 px-5 text-sm font-bold text-white">
              Call {item.phone}
            </a>
          )}
          {item.mapsUrl && (
            <a
              href={item.mapsUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-navy px-5 text-sm font-bold text-white transition hover:bg-gold hover:text-navy dark:bg-gold/20 dark:text-cream dark:hover:bg-gold dark:hover:text-navy"
            >
              {mode === "place" ? "Get Directions" : "Find on Google Maps"} <Navigation size={16} />
            </a>
          )}
        </div>
      </div>
    </motion.article>
  );

  // Only these modes open detail pages
  if (mode === "place") {
    return (
      <Link href={`/places/${item.id}`} style={{ textDecoration: "none", display: "block", height: "100%" }}>
        {card}
      </Link>
    );
  }
  if (mode === "food") {
    return (
      <Link href={`/food/${item.id}`} style={{ textDecoration: "none", display: "block", height: "100%" }}>
        {card}
      </Link>
    );
  }
  if (mode === "shopping") {
    return (
      <Link href={`/shopping/${item.id}`} style={{ textDecoration: "none", display: "block", height: "100%" }}>
        {card}
      </Link>
    );
  }

  if (mode === "kids") {
    return (
      <Link href={`/kids/${item.id}`} style={{ textDecoration: "none", display: "block", height: "100%" }}>
        {card}
      </Link>
    );
  }
  if (mode === "nightlife") {
    return (
      <Link href={`/nightlife/${item.id}`} style={{ textDecoration: "none", display: "block", height: "100%" }}>
        {card}
      </Link>
    );
  }
  if (mode === "muslim") {
    return (
      <Link href={`/muslim/${item.id}`} style={{ textDecoration: "none", display: "block", height: "100%" }}>
        {card}
      </Link>
    );
  }
  if (mode === "emergency") {
    return card;
  }
  return card;
}
