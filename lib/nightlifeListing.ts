export type NightlifeListing = {
  listingStatus?: string;
  partnerConfirmed?: boolean;
  tapOfferText?: string;
  tapOfferExpires?: string;
  tonightEventName?: string;
  tonightEventDate?: string;
};

export function londonDate() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const value = (type: string) => parts.find(part => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function publicListingStatus(item: NightlifeListing): 'Listed' | 'TAP Partner' | 'Event Partner' {
  if (item.partnerConfirmed === true && (item.listingStatus === 'TAP Partner' || item.listingStatus === 'Event Partner')) {
    return item.listingStatus;
  }
  return 'Listed';
}

export function currentOffer(item: NightlifeListing, today = londonDate()) {
  return publicListingStatus(item) !== 'Listed' && !!item.tapOfferText?.trim() &&
    (!item.tapOfferExpires || /^\d{4}-\d{2}-\d{2}$/.test(item.tapOfferExpires) && item.tapOfferExpires >= today);
}

export function tonightEvent(item: NightlifeListing, today = londonDate()) {
  return !!item.tonightEventName?.trim() && item.tonightEventDate === today;
}

export function safeExternalUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}
