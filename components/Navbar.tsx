"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";

const navLinks = [
  { href: "/places",      label: "Places",       color: null },
  { href: "/food",        label: "Food",         color: null },
  { href: "/shopping",    label: "Shopping",     color: null },
  { href: "/nightlife",   label: "Nightlife",    color: null },
  { href: "/hotels",      label: "Hotels",       color: null },
  { href: "/kids",        label: "Kids & Family",color: null },
  { href: "/theatre",     label: "Theatre",   color: null },
  { href: "/trip-builder",label: "Trip Builder", color: null },
  { href: "/saved",       label: "Saved Places", color: null },
  { href: "/areas",       label: "Explore by Area", color: null },
  { href: "/universities",label: "Universities", color: null },
  { href: "/daytrips",    label: "Day Trips",    color: null },
  { href: "/music",       label: "Music",     color: null },
  { href: "/parks",       label: "Parks & Outdoors", color: null },
  { href: "/budget",      label: "London on a Budget", color: null },
  { href: "/offers",      label: "Offers",    color: "offers" },
  { href: "/sports",      label: "Sports",    color: null },
  { href: "/hidden-gems", label: "Hidden Gems",  color: null },
  { href: "/trending",    label: "Trending",  color: null },
  { href: "/guides",      label: "Guides",    color: null },
  { href: "/events",      label: "Today",     color: null },
  { href: "/transport",   label: "Transport",    color: null },
  { href: "/emergency",   label: "Emergency",    color: "emergency" },
  { href: "/muslim",      label: "Muslim Guide", color: "muslim" },
];

// Grouped view for the dropdown menu - same 23 links, organized into
// labeled sections instead of one long flat list, which was causing
// scroll/usability problems now that the category count has grown.
const navGroups: { title: string; links: typeof navLinks }[] = [
  {
    title: "Explore",
    links: navLinks.filter(l => ["/places", "/areas", "/hidden-gems", "/trending", "/guides"].includes(l.href)),
  },
  {
    title: "Food & Nightlife",
    links: navLinks.filter(l => ["/food", "/nightlife", "/muslim"].includes(l.href)),
  },
  {
    title: "Stay & Shop",
    links: navLinks.filter(l => ["/hotels", "/shopping", "/budget"].includes(l.href)),
  },
  {
    title: "Culture & Things To Do",
    links: navLinks.filter(l => ["/theatre", "/music", "/sports", "/parks", "/universities", "/daytrips", "/kids"].includes(l.href)),
  },
  {
    title: "Plan Your Trip",
    links: navLinks.filter(l => ["/trip-builder", "/saved", "/events", "/offers"].includes(l.href)),
  },
  {
    title: "Practical",
    links: navLinks.filter(l => ["/transport", "/emergency"].includes(l.href)),
  },
];

const LANGUAGES = [
  { code: "en", label: "EN", flag: "🇬🇧", full: "English", googleCode: "" },
  { code: "fr", label: "FR", flag: "🇫🇷", full: "Français", googleCode: "fr" },
  { code: "es", label: "ES", flag: "🇪🇸", full: "Español", googleCode: "es" },
  { code: "pt", label: "PT", flag: "🇧🇷", full: "Português", googleCode: "pt" },
  { code: "ar", label: "AR", flag: "🇸🇦", full: "العربية", googleCode: "ar" },
  { code: "it", label: "IT", flag: "🇮🇹", full: "Italiano", googleCode: "it" },
  { code: "zh", label: "ZH", flag: "🇨🇳", full: "中文", googleCode: "zh-CN" },
  { code: "ko", label: "KO", flag: "🇰🇷", full: "한국어", googleCode: "ko" },
  { code: "ja", label: "JA", flag: "🇯🇵", full: "日本語", googleCode: "ja" },
  { code: "nl", label: "NL", flag: "🇳🇱", full: "Nederlands", googleCode: "nl" },
  { code: "hi", label: "HI", flag: "🇮🇳", full: "हिंदी", googleCode: "hi" },
  { code: "de", label: "DE", flag: "🇩🇪", full: "Deutsch", googleCode: "de" },
];

function getWeatherEmoji(code: number) {
  if (code === 0) return "☀️";
  if (code <= 2) return "⛅";
  if (code === 3) return "☁️";
  if (code <= 49) return "🌫️";
  if (code <= 69) return "🌧️";
  if (code <= 79) return "❄️";
  if (code <= 82) return "🌦️";
  if (code <= 99) return "⛈️";
  return "🌤️";
}

function BridgeIcon() {
  return (
    <svg aria-hidden="true" className="h-8 w-8 text-gold" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="3" />
      <path d="M9 31h30M14 31V17h6v14M28 31V17h6v14M18 17l6-5 6 5M12 24c6-5 18-5 24 0" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [weather, setWeather] = useState<{ temp: number; code: number } | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState(LANGUAGES[0]);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("taplon-dark");
    const isDark = saved === "true";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("taplon-dark", String(next));
  }

  useEffect(() => {
    fetch("https://api.open-meteo.com/v1/forecast?latitude=51.5074&longitude=-0.1278&current_weather=true")
      .then((r) => r.json())
      .then((d) => setWeather({ temp: Math.round(d.current_weather.temperature), code: d.current_weather.weathercode }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("taplon-lang");
    if (saved) {
      const found = LANGUAGES.find((l) => l.code === saved);
      if (found) setCurrentLang(found);
    }
  }, []);

  useEffect(() => {
    if (document.getElementById("gt-script")) return;
    (window as any).googleTranslateElementInit = () => {
      new (window as any).google.translate.TranslateElement({ pageLanguage: "en", autoDisplay: false }, "google_translate_element");
    };
    const script = document.createElement("script");
    script.id = "gt-script";
    script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  function selectLang(lang: typeof LANGUAGES[0]) {
    setCurrentLang(lang);
    localStorage.setItem("taplon-lang", lang.code);
    setLangOpen(false);
    if (lang.code === "en") {
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=" + window.location.hostname;
      window.location.reload();
      return;
    }
    document.cookie = `googtrans=/en/${lang.googleCode}; path=/`;
    document.cookie = `googtrans=/en/${lang.googleCode}; path=/; domain=${window.location.hostname}`;
    window.location.reload();
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function getMobileClass(color: string | null, active: boolean) {
    if (active) return "bg-navy text-white dark:bg-gold dark:text-navy";
    if (color === "emergency") return "bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/30 dark:border-red-800/40";
    if (color === "muslim") return "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/40";
    if (color === "offers") return "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/40";
    return "bg-white text-navy hover:bg-white/70 dark:bg-white/10 dark:text-cream dark:hover:bg-white/20";
  }

  return (
    <>
      <div id="google_translate_element" style={{ display: "none" }} />

      <header className="sticky top-0 z-50 border-b border-white/35 bg-cream/95 shadow-sm backdrop-blur-sm dark:bg-[#0d0d1a]/97 dark:border-white/10" style={{ transform: "translateZ(0)", willChange: "transform" }}>
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="group flex min-h-12 items-center gap-3" onClick={() => setOpen(false)}>
            <img src="/logo.jpg" alt="TAP LONDON" style={{ height: "44px", width: "44px", borderRadius: "10px", objectFit: "cover" }} />
            <span className="font-heading text-xl font-bold tracking-[0.08em] text-navy dark:text-cream">TAP LONDON</span>
          </Link>

          <div className="flex items-center gap-2">
            {/* FIX: this used to be `{weather && (<div>...)}`, which means
                the server renders NOTHING here (weather starts null), then
                the client inserts a brand new DOM element once the weather
                fetch resolves. That mismatch (missing element appearing
                after hydration, not just different content in an existing
                one) is what was producing the #423/#425/#418 hydration
                errors on every single page load, confirmed via repeated
                console captures. Now the container always renders in both
                server and client output; only the inner text is
                conditional, so the DOM shape matches from first paint. */}
            <div className="flex items-center gap-1 rounded-full bg-white/80 dark:bg-white/10 border border-navy/10 dark:border-white/15 px-2.5 py-1 text-xs font-semibold text-navy dark:text-cream backdrop-blur" style={{ minWidth: weather ? undefined : "0px", opacity: weather ? 1 : 0, pointerEvents: weather ? "auto" : "none" }}>
              <span style={{ fontSize: "0.8rem" }}>{weather ? getWeatherEmoji(weather.code) : "\u00A0"}</span>
              <span>{weather ? `${weather.temp}°C` : "\u00A0"}</span>
            </div>

            <div ref={langRef} style={{ position: "relative" }}>
              <button onClick={() => setLangOpen(!langOpen)} className="flex items-center gap-1 rounded-full bg-white/80 dark:bg-white/10 border border-navy/10 dark:border-white/15 px-2.5 py-1 text-xs font-semibold text-navy dark:text-cream backdrop-blur" style={{ minHeight: "30px" }}>
                <span style={{ fontSize: "0.9rem" }}>{currentLang.flag}</span>
                <span>{currentLang.label}</span>
                <span style={{ fontSize: "0.5rem", opacity: 0.5 }}>{langOpen ? "▲" : "▼"}</span>
              </button>
              {langOpen && (
                <div className="absolute right-0 top-[calc(100%+6px)] z-[9999] min-w-[160px] rounded-2xl border border-navy/10 dark:border-gold/20 bg-white dark:bg-[#1a1a2e] shadow-xl overflow-hidden" style={{ maxHeight: "280px", overflowY: "auto" }}>
                  {LANGUAGES.map((lang) => (
                    <button key={lang.code} onClick={() => selectLang(lang)} className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm border-b border-navy/5 dark:border-white/5 hover:bg-gold/10 transition ${currentLang.code === lang.code ? "text-[#c9a84c] font-bold" : "text-navy dark:text-cream"}`}>
                      <span style={{ fontSize: "1rem" }}>{lang.flag}</span>
                      <span>{lang.full}</span>
                      {currentLang.code === lang.code && <span className="ml-auto text-[#c9a84c]">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button type="button" onClick={toggleDark} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-navy dark:bg-gold text-white dark:text-navy shadow-sm" style={{ fontSize: "0.9rem" }} aria-label="Toggle dark mode">
              {dark ? "☀️" : "🌙"}
            </button>

            <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-navy/15 dark:border-white/15 bg-white dark:bg-white/10 text-navy dark:text-cream shadow-sm" onClick={() => setOpen((v) => !v)} aria-label={open ? "Close menu" : "Open menu"}>
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </nav>

        {open && (
          <div className="border-t border-navy/10 dark:border-white/10 bg-cream dark:bg-[#0d0d1a] px-3 pb-4 pt-2">
            <div className="mx-auto max-w-7xl">
              {weather && (
                <div className="flex items-center gap-2 px-2 py-1.5 text-[0.7rem] font-semibold text-navy/50 dark:text-cream/40">
                  <span>{getWeatherEmoji(weather.code)}</span>
                  <span>London {weather.temp}°C</span>
                </div>
              )}
              {navGroups.map((group) => group.links.length > 0 && (
                <div key={group.title} className="mb-2.5">
                  <div className="px-2 pb-1 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-navy/40 dark:text-cream/35">
                    {group.title}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {group.links.map((link) => {
                      const active = pathname === link.href;
                      return (
                        <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className={`flex min-h-8 items-center justify-center rounded-lg px-2 text-center text-[0.78rem] font-semibold leading-tight transition ${getMobileClass(link.color, active)}`}>
                          {link.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
