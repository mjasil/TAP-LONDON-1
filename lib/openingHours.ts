// Only make a live opening claim when the listing gives a usable schedule.
// All comparisons use London local time, including the daylight saving change.
const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function activeDays(label: string): number[] {
  const normalized = label.toLowerCase().replace(/monday/g, 'mon').replace(/tuesday/g, 'tue')
    .replace(/wednesday/g, 'wed').replace(/thursday/g, 'thu').replace(/friday/g, 'fri')
    .replace(/saturday/g, 'sat').replace(/sunday/g, 'sun');
  if (/\bdaily\b|every day/.test(normalized)) return [0, 1, 2, 3, 4, 5, 6];
  const days = new Set<number>();
  for (const match of Array.from(normalized.matchAll(/(sun|mon|tue|wed|thu|fri|sat)\s*[-–]\s*(sun|mon|tue|wed|thu|fri|sat)/g))) {
    let current = DAY_NAMES.indexOf(match[1]);
    const end = DAY_NAMES.indexOf(match[2]);
    for (let i = 0; i < 7; i++) {
      days.add(current);
      if (current === end) break;
      current = (current + 1) % 7;
    }
  }
  const withoutRanges = normalized.replace(/(sun|mon|tue|wed|thu|fri|sat)\s*[-–]\s*(sun|mon|tue|wed|thu|fri|sat)/g, '');
  for (const match of Array.from(withoutRanges.matchAll(/\b(sun|mon|tue|wed|thu|fri|sat)\b/g))) days.add(DAY_NAMES.indexOf(match[1]));
  return Array.from(days);
}

export function openingStatusAt(hours: unknown, date = new Date()): boolean | null {
  if (typeof hours !== 'string') return null;
  const text = hours.toLowerCase();
  if (/varies|vary|usually|typically|roughly|season|event|booking|selected|check website|dusk|sunset|street|exterior|shop[s ]/.test(text)) return null;
  if (/\b(open 24 hours|24 hours, every day|open at all times)\b/.test(text)) return true;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const value = (name: string) => parts.find(part => part.type === name)?.value || '';
  const today = DAY_NAMES.indexOf(value('weekday').toLowerCase());
  const minute = Number(value('hour')) * 60 + Number(value('minute'));
  if (today < 0 || !Number.isFinite(minute)) return null;

  let hasSchedule = false;
  for (const segment of text.split(/[;,]/)) {
    const range = segment.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
    if (!range) continue;
    const days = activeDays(segment);
    if (!days.length) continue;
    const start = Number(range[1]) * 60 + Number(range[2]);
    const end = Number(range[3]) * 60 + Number(range[4]);
    if (start > 1440 || end > 1440 || start === end) continue;
    hasSchedule = true;
    if (end > start && days.includes(today) && minute >= start && minute < end) return true;
    if (end < start && ((days.includes(today) && minute >= start) ||
      (days.includes((today + 6) % 7) && minute < end))) return true;
  }
  return hasSchedule ? false : null;
}

export function isOpenAt(hours: unknown, date = new Date()): boolean {
  return openingStatusAt(hours, date) === true;
}
