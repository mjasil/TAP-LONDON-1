import { londonToday } from './eventDates';
import { safeExternalUrl } from './nightlifeListing';

// Public issuer promotions are linked to their own terms and are never
// represented as exclusive TAP partner benefits.
const ISSUER_OFFERS: Record<string, { name: string; description: string; discount: string; sourceUrl: string }> = {
  'family-travelcard': {
    name: 'Family & Friends Railcard',
    description: 'Save 1/3 on eligible adult rail fares and 60% on eligible child fares when travelling together. Check the railcard rules before purchasing.',
    discount: 'Rail savings',
    sourceUrl: 'https://www.familyandfriends-railcard.co.uk/',
  },
  'activities-theatre-offer': {
    name: 'Official London Theatre same-day tickets',
    description: 'Browse available same-day West End ticket deals directly from the official TKTS service. Prices and shows change daily.',
    discount: 'Daily deals',
    sourceUrl: 'https://officiallondontheatre.com/ticket-booth/',
  },
};

export function verifiedOffer(item: any, now = new Date()): any | null {
  if (!item?.id) return null;
  const issuer = ISSUER_OFFERS[item.id];
  if (issuer) return { ...item, ...issuer, code: undefined, offerType: 'Official issuer offer' };

  if (item.publishStatus !== 'Published' || item.partnerConfirmed !== true ||
      !item.partnerAgreementRef?.trim() || !item.terms?.trim()) return null;
  if (!safeExternalUrl(item.sourceUrl) || !/^https:\/\//.test(item.sourceUrl)) return null;
  const verified = Date.parse(item.verifiedAt || '');
  if (!Number.isFinite(verified) || verified > now.getTime() || now.getTime() - verified > 30 * 86400000) return null;
  const today = londonToday(now);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(item.validUntil || '') || item.validUntil < today) return null;
  if (item.validFrom && item.validFrom > today) return null;
  return { ...item, offerType: 'Confirmed TAP partner offer' };
}
