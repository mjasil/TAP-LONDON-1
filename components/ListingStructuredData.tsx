type Listing = { id: string; name: string; description?: string; image?: string; area?: string; startDate?: string; endDate?: string };

export default function ListingStructuredData({ item, type, section }: { item: Listing; type: 'TouristAttraction' | 'Restaurant' | 'Event'; section: string }) {
  if (!item?.id || !item?.name) return null;
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org', '@type': type,
    name: item.name,
    url: type === 'Event' ? 'https://www.londontap.co.uk/events' : `https://www.londontap.co.uk/${section}/${encodeURIComponent(item.id)}`,
    ...(item.description ? { description: item.description } : {}),
    ...(item.image ? { image: item.image } : {}),
    ...(item.area ? { location: { '@type': 'Place', name: item.area, address: { '@type': 'PostalAddress', addressLocality: 'London', addressCountry: 'GB' } } } : {}),
  };
  if (type === 'Event') {
    if (!item.startDate) return null;
    data.startDate = item.startDate;
    if (item.endDate) data.endDate = item.endDate;
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}
