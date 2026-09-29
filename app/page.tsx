import HomePageClient from '@/components/HomePageClient';

const DEFAULT_HERO = 'https://images.pexels.com/photos/672532/pexels-photo-672532.jpeg?auto=compress&cs=tinysrgb&w=1920';
const HERO_DOCUMENT = 'https://firestore.googleapis.com/v1/projects/tap-london/databases/(default)/documents/siteImages/hero';

// The server renders the same hero URL that the browser loads, so hydration
// cannot briefly show a hardcoded image before the saved image arrives.
export const revalidate = 30;

async function getHeroImage(): Promise<string> {
  try {
    const response = await fetch(HERO_DOCUMENT, { next: { revalidate: 30 } });
    if (!response.ok) return DEFAULT_HERO;

    const document = await response.json();
    const url = document.fields?.url?.stringValue;
    if (typeof url === 'string' && /^https?:\/\//.test(url)) return url;
  } catch {
    // Keep the site usable if Firestore is temporarily unavailable.
  }
  return DEFAULT_HERO;
}

export default async function HomePage() {
  return <HomePageClient heroImage={await getHeroImage()} />;
}
