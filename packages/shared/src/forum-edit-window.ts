const DEFAULT_EDIT_WINDOW_MINUTES = 10;

/** Normalizes scalar-config value: 0 = disabled, -1 = unlimited, >0 = minutes. */
export function parseEditWindowMinutes(value: unknown, fallback = DEFAULT_EDIT_WINDOW_MINUTES): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.trunc(value);
}

export function canEditForumContent(
  createdAt: Date | string,
  windowMinutes: number,
  now: Date = new Date(),
): boolean {
  const normalized = parseEditWindowMinutes(windowMinutes, DEFAULT_EDIT_WINDOW_MINUTES);
  if (normalized === 0) return false;
  if (normalized < 0) return true;

  const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const elapsedMs = now.getTime() - created.getTime();
  return elapsedMs <= normalized * 60_000;
}
