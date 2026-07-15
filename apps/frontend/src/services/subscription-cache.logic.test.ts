import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  cacheHasScope,
  mergeFetchedRows,
  removeSubscriptionById,
  scopesToFetch,
  upsertSubscription,
} from './subscription-cache.logic.js';
import type { EventSubscription } from './subscription-helpers.js';

function row(
  partial: Partial<EventSubscription> & Pick<EventSubscription, 'id'>,
): EventSubscription {
  return {
    userId: 'u1',
    sourceDomain: 'platform',
    targetType: 'TAG',
    targetId: 'tag-1',
    options: {},
    createdAt: '2026-07-16T10:00:00.000Z',
    ...partial,
  };
}

describe('subscription-cache.logic', () => {
  it('treats all as covering any domain', () => {
    assert.equal(cacheHasScope(new Set(['all']), 'platform'), true);
    assert.equal(cacheHasScope(new Set(['forum']), 'platform'), false);
    assert.equal(scopesToFetch(new Set(['platform']), 'platform'), null);
    assert.equal(scopesToFetch(new Set(['platform']), 'forum'), 'forum');
  });

  it('upserts and removes by id', () => {
    const a = row({ id: 'a', createdAt: '2026-07-16T09:00:00.000Z' });
    const b = row({ id: 'b', targetId: 'tag-2', createdAt: '2026-07-16T11:00:00.000Z' });
    const updated = upsertSubscription([a], b);
    assert.deepEqual(
      updated.map((r) => r.id),
      ['b', 'a'],
    );
    assert.deepEqual(
      removeSubscriptionById(updated, 'a').map((r) => r.id),
      ['b'],
    );
  });

  it('merges fetched pages without duplicates', () => {
    const a = row({ id: 'a', createdAt: '2026-07-16T09:00:00.000Z' });
    const a2 = row({
      id: 'a',
      targetTitle: 'Крым',
      createdAt: '2026-07-16T09:00:00.000Z',
    });
    const c = row({ id: 'c', createdAt: '2026-07-16T12:00:00.000Z' });
    const merged = mergeFetchedRows([a], [a2, c]);
    assert.equal(merged.length, 2);
    assert.equal(merged[0]?.id, 'c');
    assert.equal(merged.find((r) => r.id === 'a')?.targetTitle, 'Крым');
  });
});
