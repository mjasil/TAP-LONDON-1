import { safeExternalUrl } from '@/lib/nightlifeListing';

type ListingSourceProps = {
  item: {
    sourceName?: string;
    sourceUrl?: string;
    osmUrl?: string;
    openingStatusVerified?: boolean;
  };
};

export default function ListingSource({ item }: ListingSourceProps) {
  if (item.sourceName !== 'Wikidata and OpenStreetMap' && item.sourceName !== 'Wikidata') return null;

  return (
    <p className="mt-4 text-xs leading-6 text-ink/60 dark:text-cream/65">
      Location details: <a href={safeExternalUrl(item.sourceUrl) || 'https://www.wikidata.org/'} target="_blank" rel="noopener noreferrer" className="underline">Wikidata</a>
      {item.osmUrl && <> and <a href={safeExternalUrl(item.osmUrl) || 'https://www.openstreetmap.org/copyright'} target="_blank" rel="noopener noreferrer" className="underline">OpenStreetMap contributors</a> (ODbL)</>}.
      {item.openingStatusVerified !== true && ' Opening status and hours are unverified; check with the venue before visiting.'}
    </p>
  );
}
