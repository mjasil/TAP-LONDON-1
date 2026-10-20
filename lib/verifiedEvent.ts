import { londonToday } from './eventDates';
import { safeExternalUrl } from './nightlifeListing';

// An admin-reviewed event needs a current source and a bounded date range.
// A recurring label alone cannot extend an old occurrence into the future.
export function isPublishedEvent(item: any, now = new Date()): boolean {
  if (item?.publishStatus !== 'Published' || item?.cancelled === true) return false;
  if (!safeExternalUrl(item.sourceUrl) || !/^https:\/\//.test(item.sourceUrl)) return false;
  const checked = Date.parse(item.verifiedAt || '');
  if (!Number.isFinite(checked) || checked > now.getTime() || now.getTime() - checked > 30 * 86400000) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(item.startDate || '') || !/^\d{4}-\d{2}-\d{2}$/.test(item.endDate || '')) return false;
  return item.startDate <= item.endDate && item.endDate >= londonToday(now);
}
