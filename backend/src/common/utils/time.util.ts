export const INTERVAL_TO_MINUTES: Record<'3m' | '5m' | '15m', number> = {
  '3m': 3,
  '5m': 5,
  '15m': 15,
};

export function parseClock(clock: string): number {
  const [hours, minutes] = clock.split(':').map((item) => Number(item));
  return (hours * 60 + minutes) * 60 * 1000;
}

function getDatePartsInTimezone(
  date: Date,
  timezone: string,
): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);

  return { year, month, day };
}

function getTimezoneOffsetMs(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value);
  const second = Number(parts.find((part) => part.type === 'second')?.value);

  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return asUtc - date.getTime();
}

function timezoneDateTimeToUtc(
  timezone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const firstPass = utcGuess - getTimezoneOffsetMs(new Date(utcGuess), timezone);
  const secondPass = utcGuess - getTimezoneOffsetMs(new Date(firstPass), timezone);
  return new Date(secondPass);
}

function deriveMarketStartForDate(
  referenceDate: Date,
  marketStartClock: string,
  timezone: string,
): Date {
  const { year, month, day } = getDatePartsInTimezone(referenceDate, timezone);
  const [marketHour, marketMinute] = marketStartClock.split(':').map((item) => Number(item));
  return timezoneDateTimeToUtc(timezone, year, month, day, marketHour, marketMinute);
}

export function formatClock(date: Date, timezone = 'Asia/Kolkata'): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: timezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

export function deriveSystemTime(
  realNow: Date,
  anchorRealTimeIso: string,
  marketStartClock: string,
  timezone = 'Asia/Kolkata',
): Date {
  const anchorRealTime = new Date(anchorRealTimeIso);
  const elapsed = realNow.getTime() - anchorRealTime.getTime();
  const marketStart = deriveMarketStartForDate(anchorRealTime, marketStartClock, timezone);
  return new Date(marketStart.getTime() + elapsed);
}

export function deriveCompletedCandleCount(
  systemTime: Date,
  marketStartClock: string,
  interval: '3m' | '5m' | '15m',
  timezone = 'Asia/Kolkata',
): number {
  const marketStart = deriveMarketStartForDate(systemTime, marketStartClock, timezone);

  const elapsedMs = systemTime.getTime() - marketStart.getTime();
  if (elapsedMs <= 0) {
    return 0;
  }

  const intervalMs = INTERVAL_TO_MINUTES[interval] * 60 * 1000;
  return Math.floor(elapsedMs / intervalMs);
}
