import type { Metadata } from 'next';
import LocationCheck from '@/components/LocationCheck';

export const metadata: Metadata = {
  title: 'Location check',
  robots: { index: false, follow: false },
};

export default function LocationCheckPage() {
  return <LocationCheck />;
}
