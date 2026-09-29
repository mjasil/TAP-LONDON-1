'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { fetchDocument } from '@/lib/firestore';

type PopupConfig = {
  enabled: boolean;
  title: string;
  subtitle: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  image: string;
  expiresAt: string;
  showOnce: boolean;
  delaySeconds: number;
};

// FIX: this component used to have its own hand-rolled fetch() call, direct
// to the Firestore REST API, completely separate from lib/firestore.ts - no
// retry-on-429 logic at all, and firing 2 MORE simultaneous requests
// (section popup + global popup) on top of whatever else a page was already
// loading. That's a real contributor to the 429 storm seen in the console,
// since it ran on every single page navigation. Now routed through the
// shared fetchDocument(), which has retry-with-backoff built in.
async function fetchPopup(docId: string): Promise<PopupConfig | null> {
  const doc = await fetchDocument('popups', docId);
  if (!doc) return null;
  return {
    enabled: doc.enabled ?? false,
    title: doc.title ?? '',
    subtitle: doc.subtitle ?? '',
    body: doc.body ?? '',
    ctaLabel: doc.ctaLabel ?? 'Explore Now',
    ctaUrl: doc.ctaUrl ?? '/places',
    image: doc.image ?? '',
    expiresAt: doc.expiresAt ?? '',
    showOnce: doc.showOnce ?? true,
    delaySeconds: typeof doc.delaySeconds === 'number' ? doc.delaySeconds : 3,
  };
}

export default function PopupLoader() {
  const [popup, setPopup] = useState<PopupConfig | null>(null);
  const [show, setShow] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    let showTimer: ReturnType<typeof setTimeout> | undefined;
    setShow(false);
    setPopup(null);
    const load = async () => {
      try {
        const section = pathname.split('/')[1] || 'global';
        // Fetch section popup first; only fetch the global fallback if
        // needed, instead of always firing both requests together.
        let cfg: PopupConfig | null = await fetchPopup(section);
        if (!cfg?.enabled) {
          cfg = section === 'global' ? cfg : await fetchPopup('global');
        }

        if (cancelled || !cfg?.enabled) return;
        if (cfg.expiresAt && new Date(cfg.expiresAt) < new Date()) return;

        const storageKey = 'tap-popup-' + section;
        if (cfg.showOnce && sessionStorage.getItem(storageKey)) return;

        setPopup(cfg);
        showTimer = setTimeout(() => { if (!cancelled) setShow(true); }, (cfg.delaySeconds ?? 3) * 1000);
      } catch {}
    };
    const loadTimer = setTimeout(load, 1000);
    return () => {
      cancelled = true;
      clearTimeout(loadTimer);
      if (showTimer) clearTimeout(showTimer);
    };
  }, [pathname]);

  const handleClose = () => {
    setShow(false);
    if (popup?.showOnce) {
      const section = pathname.split('/')[1] || 'global';
      sessionStorage.setItem('tap-popup-' + section, '1');
    }
  };

  if (!popup) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={handleClose}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        >
          <motion.div
            initial={{ scale: 0.88, y: 32, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            onClick={e => e.stopPropagation()}
            style={{ background: '#1a1a2e', border: '1px solid rgba(201,168,76,0.22)', borderRadius: '20px', padding: '32px', maxWidth: '420px', width: '100%', position: 'relative', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}
          >
            <button onClick={handleClose} style={{ position: 'absolute', top: '14px', right: '14px', background: 'rgba(255,255,255,0.08)', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', width: '30px', height: '30px', borderRadius: '50%', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>

            {popup.image && (
              <div style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '18px', maxHeight: '200px' }}>
                <img src={popup.image} alt="" style={{ width: '100%', objectFit: 'cover', maxHeight: '200px', display: 'block' }} />
              </div>
            )}

            {popup.subtitle && (
              <div style={{ display: 'inline-block', background: 'rgba(201,168,76,0.15)', color: '#c9a84c', borderRadius: '20px', padding: '4px 14px', fontSize: '0.72rem', fontWeight: 700, marginBottom: '10px', fontFamily: "'DM Sans', sans-serif" }}>
                {popup.subtitle}
              </div>
            )}

            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.7rem', fontWeight: 700, color: '#fff', margin: '0 0 12px', lineHeight: 1.15 }}>{popup.title}</h2>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.88rem', color: 'rgba(255,255,255,0.58)', margin: '0 0 24px', lineHeight: 1.6 }}>{popup.body}</p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <Link href={popup.ctaUrl || '/places'} onClick={handleClose}
                style={{ flex: 1, background: 'linear-gradient(135deg, #c9a84c, #f0d07a)', color: '#1a1a2e', borderRadius: '10px', padding: '13px 20px', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none', textAlign: 'center' as const, fontFamily: "'DM Sans', sans-serif", display: 'block' }}>
                {popup.ctaLabel || 'Explore'}
              </Link>
              <button onClick={handleClose}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', borderRadius: '10px', padding: '13px 18px', cursor: 'pointer', fontSize: '0.84rem', fontFamily: "'DM Sans', sans-serif" }}>
                Not now
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
