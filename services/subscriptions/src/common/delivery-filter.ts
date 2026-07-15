export type QuietHours = {
  start: string;
  end: string;
  tz: string;
};

function parseHm(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

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

export function shouldSendPush(input: {
  pushEnabled: boolean;
  quietHours: QuietHours | null | undefined;
  now?: Date;
}): boolean {
  if (!input.pushEnabled) return false;
  if (isInQuietHours(input.quietHours, input.now)) return false;
  return true;
}

/** Pure filter of matched users against exclude + push prefs. */
export function filterEligibleUserIds(input: {
  matchedUserIds: ReadonlyArray<string>;
  excludeUserIds?: ReadonlyArray<string>;
  prefsByUserId: ReadonlyMap<string, { pushEnabled: boolean; quietHours: QuietHours | null }>;
  now?: Date;
}): string[] {
  const exclude = new Set(input.excludeUserIds ?? []);
  const eligible: string[] = [];
  for (const userId of input.matchedUserIds) {
    if (exclude.has(userId)) continue;
    const pref = input.prefsByUserId.get(userId);
    if (!pref) {
      // Fail-open when prefs missing (same as BFF HTTP fan-out).
      eligible.push(userId);
      continue;
    }
    if (
      shouldSendPush({
        pushEnabled: pref.pushEnabled,
        quietHours: pref.quietHours,
        now: input.now,
      })
    ) {
      eligible.push(userId);
    }
  }
  return eligible;
}
