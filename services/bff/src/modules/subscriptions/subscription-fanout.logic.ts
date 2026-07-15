export type FanoutResult = {
  notified: number;
  skipped: number;
};

export type QuietHours = {
  start: string;
  end: string;
  tz: string;
};

/** Merge match batches and drop excluded actors (pure; unit-tested). */
export function collectMatchedUserIds(
  batches: ReadonlyArray<ReadonlyArray<string>>,
  excludeUserIds: ReadonlyArray<string> = [],
): string[] {
  const exclude = new Set(excludeUserIds);
  const matched = new Set<string>();
  for (const batch of batches) {
    for (const userId of batch) {
      if (!exclude.has(userId)) matched.add(userId);
    }
  }
  return [...matched];
}

/** Public stats only — never expose matched user IDs to API clients. */
export function toFanoutResult(matchedCount: number, notified: number): FanoutResult {
  const skipped = Math.max(0, matchedCount - notified);
  return { notified, skipped };
}

function parseHm(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Current minutes-from-midnight in IANA tz; falls back to local if tz invalid. */
export function minutesNowInTz(now: Date, tz: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz || 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);
    const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
    const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
    return hour * 60 + minute;
  } catch {
    return now.getHours() * 60 + now.getMinutes();
  }
}

/**
 * Quiet hours window (supports overnight, e.g. 22:00–08:00).
 * Missing/invalid → not quiet.
 */
export function isInQuietHours(
  quiet: QuietHours | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!quiet?.start || !quiet?.end) return false;
  const start = parseHm(quiet.start);
  const end = parseHm(quiet.end);
  if (start == null || end == null || start === end) return false;
  const cur = minutesNowInTz(now, quiet.tz || 'UTC');
  if (start < end) return cur >= start && cur < end;
  return cur >= start || cur < end;
}

/** Whether push/in-app fan-out should run for this delivery preference. */
export function shouldSendPush(input: {
  pushEnabled: boolean;
  quietHours: QuietHours | null | undefined;
  now?: Date;
}): boolean {
  if (!input.pushEnabled) return false;
  if (isInQuietHours(input.quietHours, input.now)) return false;
  return true;
}
