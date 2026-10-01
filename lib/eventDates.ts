// Dates in the CMS are date-only strings. Compare them as London calendar
// days instead of parsing them as UTC midnight in the visitor's time zone.
export function londonToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const value = (type: string) => parts.find(part => part.type === type)?.value || '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function occursInWindow(event: { startDate?: string; endDate?: string }, from: string, to: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(event.startDate || '')) return false;
  const end = /^\d{4}-\d{2}-\d{2}$/.test(event.endDate || '') ? event.endDate! : event.startDate!;
  return event.startDate! <= to && end >= from;
}

export function addCalendarDays(day: string, count: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}
