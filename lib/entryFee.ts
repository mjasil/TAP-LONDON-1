// A free exterior does not make a ticketed exhibition or tour free.
export function isFullyFree(item: { priceType?: string; entryFee?: string }): boolean {
  const fee = (item.entryFee || '').toLowerCase();
  if (/£\s?\d/.test(fee)) return false;
  if (item.priceType === 'Paid') return false;
  return item.priceType === 'Free' || /\bfree\b/.test(fee);
}
