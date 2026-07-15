/** Plan-config limit key for monthly invite codes (canonical; not scalar-config). */
export const INVITE_MONTHLY_LIMIT_KEY = 'club.member.invite.monthlyMax';

export const DEFAULT_INVITES_PER_MONTH_FALLBACK = 10;

/** Count invites created in the UTC calendar month of `now`. */
export function countInvitesCreatedThisMonth(
  invites: ReadonlyArray<{ createdAt: string }>,
  now: Date = new Date(),
): number {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return invites.filter((item) => {
    const created = new Date(item.createdAt);
    return created >= monthStart && created < nextMonth;
  }).length;
}

/**
 * plan-config `unknown_variable` returns allowed=false, limit=null, remaining=0.
 * Unlimited returns allowed=true, limit=null, remaining=null.
 */
export function isUnknownPlanLimit(check: {
  allowed: boolean;
  limit: number | null;
  remaining: number | null;
}): boolean {
  return !check.allowed && check.limit == null && check.remaining === 0;
}

export function resolveEnvInviteLimit(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}
