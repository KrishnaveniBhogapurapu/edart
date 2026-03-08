export const INTERVAL_TO_MINUTES: Record<'3m' | '5m' | '15m', number> = {
  '3m': 3,
  '5m': 5,
  '15m': 15,
};

export function parseClock(clock: string): number {
  const [hours, minutes] = clock.split(':').map((item) => Number(item));
  return (hours * 60 + minutes) * 60 * 1000;
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
): Date {
  const anchorRealTime = new Date(anchorRealTimeIso);
  const elapsed = realNow.getTime() - anchorRealTime.getTime();

  const systemDate = new Date(anchorRealTime);
  const marketStartMs = parseClock(marketStartClock);
  systemDate.setHours(0, 0, 0, 0);

  const marketStart = new Date(systemDate.getTime() + marketStartMs);
  return new Date(marketStart.getTime() + elapsed);
}

export function deriveCompletedCandleCount(
  systemTime: Date,
  marketStartClock: string,
  interval: '3m' | '5m' | '15m',
): number {
  const marketStartMs = parseClock(marketStartClock);
  const dayStart = new Date(systemTime);
  dayStart.setHours(0, 0, 0, 0);
  const marketStart = new Date(dayStart.getTime() + marketStartMs);

  const elapsedMs = systemTime.getTime() - marketStart.getTime();
  if (elapsedMs <= 0) {
    return 0;
  }

  const intervalMs = INTERVAL_TO_MINUTES[interval] * 60 * 1000;
  return Math.floor(elapsedMs / intervalMs);
}
