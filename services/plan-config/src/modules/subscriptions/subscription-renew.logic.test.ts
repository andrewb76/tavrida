import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  addBillingPeriod,
  activateIdempotencyKey,
  isExpireDue,
  isRenewDue,
  nextExpiresAt,
  renewIdempotencyKey,
  resolveBillingPeriod,
  type RenewCandidate,
  utcDayKey,
} from './subscription-renew.logic';

function sub(partial: Partial<RenewCandidate> & Pick<RenewCandidate, 'userId'>): RenewCandidate {
  return {
    planId: 'basic',
    status: 'ACTIVE',
    autoRenew: true,
    startsAt: new Date('2026-06-16T00:00:00.000Z'),
    expiresAt: new Date('2026-07-16T00:00:00.000Z'),
    billingPeriod: 'monthly',
    ...partial,
  };
}

describe('subscription-renew.logic', () => {
  it('detects renew and expire due', () => {
    const now = new Date('2026-07-16T12:00:00.000Z');
    assert.equal(isRenewDue(sub({ userId: 'u1' }), now), true);
    assert.equal(
      isRenewDue(sub({ userId: 'u1', expiresAt: new Date('2026-07-17T00:00:00.000Z') }), now),
      false,
    );
    assert.equal(isExpireDue(sub({ userId: 'u2', autoRenew: false }), now), true);
    assert.equal(isExpireDue(sub({ userId: 'u2', autoRenew: true }), now), false);
  });

  it('resolves billing period from stored or duration', () => {
    assert.equal(resolveBillingPeriod(sub({ userId: 'a', billingPeriod: 'yearly' })), 'yearly');
    assert.equal(
      resolveBillingPeriod(
        sub({
          userId: 'b',
          billingPeriod: null,
          startsAt: new Date('2025-07-16T00:00:00.000Z'),
          expiresAt: new Date('2026-07-16T00:00:00.000Z'),
        }),
      ),
      'yearly',
    );
    assert.equal(
      resolveBillingPeriod(
        sub({
          userId: 'c',
          billingPeriod: null,
          startsAt: new Date('2026-06-16T00:00:00.000Z'),
          expiresAt: new Date('2026-07-16T00:00:00.000Z'),
        }),
      ),
      'monthly',
    );
  });

  it('adds periods and next expiry from boundary', () => {
    const now = new Date('2026-07-16T12:00:00.000Z');
    const expired = new Date('2026-07-15T00:00:00.000Z');
    const next = nextExpiresAt(expired, 'monthly', now);
    assert.equal(next.toISOString(), addBillingPeriod(now, 'monthly').toISOString());

    const future = new Date('2026-07-20T00:00:00.000Z');
    const fromFuture = nextExpiresAt(future, 'monthly', now);
    assert.equal(fromFuture.toISOString(), addBillingPeriod(future, 'monthly').toISOString());
  });

  it('builds stable idempotency keys', () => {
    const exp = new Date('2026-07-16T00:00:00.000Z');
    assert.equal(
      renewIdempotencyKey('user-1', exp),
      'plan-config.renew:user-1:2026-07-16T00:00:00.000Z',
    );
    assert.equal(
      activateIdempotencyKey('user-1', 'basic', 'monthly', utcDayKey(exp)),
      'plan-config.activate:user-1:basic:monthly:2026-07-16',
    );
  });
});
