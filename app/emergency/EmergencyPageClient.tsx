'use client';

import { useState } from 'react';
import DirectoryClient from '@/components/DirectoryClient';
import { fetchCollection } from '@/lib/firestore';

export default function EmergencyPageClient({ initialItems }: { initialItems: any[] }) {
  const [items, setItems] = useState<any[]>(initialItems);
  const [loading, setLoading] = useState(false);

  const [loadFailed, setLoadFailed] = useState(initialItems.length === 0);

  const load = async () => {
    setLoading(true);
    setLoadFailed(false);
    const firebaseItems = await fetchCollection('emergency');
    if (firebaseItems && firebaseItems.length > 0) {
      setItems(firebaseItems);
    } else {
      setLoadFailed(true);
    }
    setLoading(false);
  };

  return (
    <section className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-9 max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-gold">Emergency</p>
          <h1 className="mt-3 font-heading text-5xl font-bold text-navy dark:text-cream">Emergency Help</h1>
          <p className="mt-5 text-lg leading-8 text-ink/70 dark:text-cream/70">Hospitals, police, safety tips and emergency numbers for London visitors.</p>
        </div>
        <div className="mb-8 flex flex-wrap gap-3 rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/30">
          <a href="tel:999" className="rounded-full bg-red-700 px-5 py-3 font-bold text-white">Emergency: call 999</a>
          <a href="tel:111" className="rounded-full bg-white px-5 py-3 font-bold text-navy">Urgent medical advice: call 111</a>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(26,26,46,0.3)', fontFamily: "'DM Sans', sans-serif" }}>Loading...</div>
        ) : loadFailed ? (
          <div className="py-14 text-center text-ink/70 dark:text-cream/70">Couldn't load the directory. <button onClick={load} className="font-bold text-gold">Retry</button></div>
        ) : (
          <DirectoryClient items={items} tabs={["Hospitals", "Police", "Scam Alerts", "Helplines"]} mode="emergency" searchPlaceholder="Search emergency services" />
        )}
      </div>
    </section>
  );
}
