import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  countInvitesCreatedThisMonth,
  isUnknownPlanLimit,
  resolveEnvInviteLimit,
} from './invite-quota.logic';

describe('invite-quota.logic', () => {
  it('counts invites in UTC month', () => {
    const now = new Date('2026-07-16T12:00:00.000Z');
    const n = countInvitesCreatedThisMonth(
      [
        { createdAt: '2026-07-01T00:00:00.000Z' },
        { createdAt: '2026-07-15T23:59:59.000Z' },
        { createdAt: '2026-06-30T23:59:59.000Z' },
        { createdAt: '2026-08-01T00:00:00.000Z' },
      ],
      now,
    );
    assert.equal(n, 2);
  });

  it('detects unknown plan-config variable shape', () => {
    assert.equal(
      isUnknownPlanLimit({ allowed: false, limit: null, remaining: 0 }),
      true,
    );
    assert.equal(
      isUnknownPlanLimit({ allowed: true, limit: null, remaining: null }),
      false,
    );
    assert.equal(
      isUnknownPlanLimit({ allowed: false, limit: 3, remaining: 0 }),
      false,
    );
  });

  it('resolves env fallback limit', () => {
    assert.equal(resolveEnvInviteLimit(undefined, 10), 10);
    assert.equal(resolveEnvInviteLimit('3', 10), 3);
    assert.equal(resolveEnvInviteLimit('bad', 10), 10);
  });
});
