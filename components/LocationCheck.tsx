'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type Result = { state: 'idle' | 'running' | 'success' | 'error'; message: string };
const initial: Result = { state: 'idle', message: 'Not tested' };

export default function LocationCheck() {
  const [context, setContext] = useState<Record<string, string>>({});
  const [location, setLocation] = useState<Result>(initial);
  const [listings, setListings] = useState<Result>(initial);
  const [copied, setCopied] = useState(false);
  const generation = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const controller = useRef<AbortController>();

  const readContext = () => {
    const policyDocument = document as Document & {
      permissionsPolicy?: { allowsFeature: (feature: string) => boolean };
      featurePolicy?: { allowsFeature: (feature: string) => boolean };
    };
    const policy = policyDocument.permissionsPolicy || policyDocument.featurePolicy;
    let supported = false;
    try { supported = !!navigator.geolocation; } catch { /* Restricted browser. */ }
    const info = {
      'Secure connection': window.isSecureContext ? 'Yes' : 'No',
      'Location API available': supported ? 'Yes' : 'No',
      'Page opened directly': window.self === window.top ? 'Yes' : 'No — embedded in another page',
      'Page allows location': policy ? (policy.allowsFeature('geolocation') ? 'Yes' : 'No') : 'Browser does not report this',
      'Browser permission': 'Not reported',
      Browser: navigator.userAgent,
    };
    setContext(info);
    const current = generation.current;
    try {
      navigator.permissions?.query({ name: 'geolocation' }).then(permission => {
        if (current === generation.current) setContext(previous => ({ ...previous, 'Browser permission': permission.state }));
      }).catch(() => {});
    } catch { /* Older Safari does not support this permission query. */ }
  };

  useEffect(() => {
    readContext();
    return () => { generation.current++; clearTimeout(timer.current); controller.current?.abort(); };
  }, []);

  const run = () => {
    const current = ++generation.current;
    clearTimeout(timer.current);
    controller.current?.abort();
    setCopied(false);
    setLocation({ state: 'running', message: 'Waiting for the browser…' });
    setListings({ state: 'running', message: 'Checking London listings…' });
    const started = Date.now();
    let finished = false;
    const finish = (state: 'success' | 'error', message: string) => {
      if (finished || current !== generation.current) return;
      finished = true;
      clearTimeout(timer.current);
      setLocation({ state, message: `${message} (${((Date.now() - started) / 1000).toFixed(1)} seconds)` });
      readContext();
    };
    timer.current = setTimeout(() => finish('error', 'The browser did not return a location or an error within 20 seconds.'), 20000);
    // Call the browser directly, within the tap, independently of Near Me's
    // retry helper and of the listings request. Never retain the coordinates.
    try {
      if (!navigator.geolocation) finish('error', 'Location API is not available in this browser.');
      else navigator.geolocation.getCurrentPosition(
        () => finish('success', 'The browser returned a location successfully. No coordinates were saved.'),
        error => finish('error', `Browser error ${error.code}: ${error.message || 'No error description supplied'}`),
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 0 },
      );
    } catch (error) {
      finish('error', `The location request threw an error: ${error instanceof Error ? error.message : String(error)}`);
    }
    readContext();

    const request = new AbortController();
    controller.current = request;
    const deadline = setTimeout(() => request.abort(), 15000);
    fetch('/api/directory/food?q=soho', { signal: request.signal, cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error(`Server returned HTTP ${response.status}`);
        const page = await response.json();
        if (!Array.isArray(page.items) || page.items.length === 0) throw new Error('No listings returned');
        if (current === generation.current) setListings({ state: 'success', message: `${page.items.length} London listings loaded successfully.` });
      })
      .catch(error => {
        if (current === generation.current) setListings({ state: 'error', message: error.name === 'AbortError' ? 'Listings request timed out.' : error.message });
      })
      .finally(() => clearTimeout(deadline));
  };

  const report = ['TAP London location check', ...Object.entries(context).map(([key, value]) => `${key}: ${value}`),
    `Location: ${location.message}`, `Listings: ${listings.message}`].join('\n');
  const running = location.state === 'running' || listings.state === 'running';

  return <section style={{ maxWidth: 680, margin: '0 auto', padding: '40px 20px 80px', color: '#1a1a2e' }}>
    <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Check location on this phone</h1>
    <p style={{ margin: '16px 0', lineHeight: 1.7 }}>This checks the browser’s location request and London listings separately. Your coordinates are not displayed, sent to our server or saved.</p>
    <button type="button" onClick={run} disabled={running} style={{ padding: '14px 20px', background: '#1a1a2e', color: '#fff', border: 0, borderRadius: 10, fontWeight: 700, opacity: running ? 0.6 : 1 }}>
      {running ? 'Checking…' : 'Test location and listings'}
    </button>
    <div aria-live="polite" style={{ margin: '24px 0', display: 'grid', gap: 12 }}>
      {[['Phone location', location], ['London listings', listings]].map(([label, result]) => {
        const value = result as Result;
        return <div key={String(label)} style={{ background: '#f4f2ec', borderRadius: 12, padding: 16 }}>
          <h2 style={{ fontWeight: 700 }}>{String(label)}</h2>
          <p style={{ marginTop: 8, overflowWrap: 'anywhere' }}>{value.message}</p>
        </div>;
      })}
    </div>
    <details><summary style={{ fontWeight: 700, cursor: 'pointer' }}>Full test result</summary>
      <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', padding: '16px 0', fontSize: 12 }}>{report}</pre>
    </details>
    <button type="button" disabled={running || location.state === 'idle'} onClick={async () => {
      try { await navigator.clipboard.writeText(report); setCopied(true); } catch { setCopied(false); }
    }} style={{ margin: '20px 0', padding: '10px 14px', borderRadius: 8, border: '1px solid #bbb' }}>{copied ? 'Copied' : 'Copy test result'}</button>
    <p style={{ fontSize: 14, lineHeight: 1.7 }}>Share the test result in this chat so we can identify what fails on your phone. The test does not change your permissions.</p>
    <p style={{ marginTop: 20 }}><Link href="/">Back to TAP London</Link></p>
  </section>;
}
