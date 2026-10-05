// Only these sections have an individual listing page. Other search results
// should open their section rather than linking to a nonexistent route.
const detailSections = new Set(['places', 'food', 'shopping', 'nightlife', 'kids', 'muslim']);

export function listingRoute(section: string, id: string): string {
  const path = `/${section.replace(/^\/+|\/+$/g, '')}`;
  return detailSections.has(path.slice(1)) && id ? `${path}/${encodeURIComponent(id)}` : path;
}
