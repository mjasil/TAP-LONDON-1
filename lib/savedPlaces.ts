export type SavedPlace = { key: string; name: string; area?: string; href: string };
const STORAGE_KEY = 'tap_saved_places';

export function readSavedPlaces(): SavedPlace[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value.filter(p => typeof p?.href === 'string' && typeof p?.name === 'string').slice(0, 200) : [];
  } catch { return []; }
}

export function toggleSavedPlace(place: SavedPlace): SavedPlace[] {
  const previous = readSavedPlaces();
  const next = previous.some(p => p.key === place.key) ? previous.filter(p => p.key !== place.key) : [...previous, place];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event('tap-saved-places'));
  return next;
}
