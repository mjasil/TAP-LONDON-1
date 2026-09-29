// Only these sections have an individual listing page. Other search results
// should open their section rather than linking to a nonexistent route.
const detailSections = new Set(['places', 'food', 'shopping', 'nightlife', 'kids', 'muslim']);

export function listingRoute(section: string, id: string): string {
  return detailSections.has(section) ? `${section}/${encodeURIComponent(id)}` : section;
}
