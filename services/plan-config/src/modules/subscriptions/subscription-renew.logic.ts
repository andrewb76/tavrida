export type BillingPeriod = 'monthly' | 'yearly';

export type RenewCandidate = {
  userId: string;
  planId: string;
  status: string;
  autoRenew: boolean;
  startsAt: Date;
  expiresAt: Date | null;
  billingPeriod?: BillingPeriod | null;
};

export function addBillingPeriod(date: Date, period: BillingPeriod): Date {
  const next = new Date(date.getTime());
  if (period === 'yearly') {
    next.setUTCFullYear(next.getUTCFullYear() + 1);
  } else {
    next.setUTCMonth(next.getUTCMonth() + 1);
  }
  return next;
}

/** ACTIVE + autoRenew + expiresAt <= now. */
export function isRenewDue(sub: RenewCandidate, now: Date = new Date()): boolean {
  if (sub.status !== 'ACTIVE' || !sub.autoRenew || !sub.expiresAt) return false;
  return sub.expiresAt.getTime() <= now.getTime();
}

/** ACTIVE + !autoRenew + expiresAt <= now → mark expired (no charge). */
export function isExpireDue(sub: RenewCandidate, now: Date = new Date()): boolean {
  if (sub.status !== 'ACTIVE' || sub.autoRenew || !sub.expiresAt) return false;
  return sub.expiresAt.getTime() <= now.getTime();
}

export function resolveBillingPeriod(sub: RenewCandidate): BillingPeriod {
  if (sub.billingPeriod === 'monthly' || sub.billingPeriod === 'yearly') {
    return sub.billingPeriod;
  }
  if (!sub.expiresAt) return 'monthly';
  const days = (sub.expiresAt.getTime() - sub.startsAt.getTime()) / 86_400_000;
  return days >= 300 ? 'yearly' : 'monthly';
}

/** Extend from later of now / current expiresAt. */
export function nextExpiresAt(
  currentExpiresAt: Date,
  period: BillingPeriod,
  now: Date = new Date(),
): Date {
  const base = currentExpiresAt.getTime() > now.getTime() ? currentExpiresAt : now;
  return addBillingPeriod(base, period);
}

/** Stable across retries for the same expiry boundary. */
export function renewIdempotencyKey(userId: string, expiresAt: Date): string {
  return `plan-config.renew:${userId}:${expiresAt.toISOString()}`;
}

export function activateIdempotencyKey(
  userId: string,
  planId: string,
  period: BillingPeriod,
  dayUtc: string,
): string {
  return `plan-config.activate:${userId}:${planId}:${period}:${dayUtc}`;
}

export function utcDayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
