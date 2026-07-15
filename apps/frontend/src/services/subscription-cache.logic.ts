import type { EventSubscription, SourceDomain, TargetType } from './subscription-helpers.js';
import { findSubscription } from './subscription-helpers.js';
export type CacheScope = SourceDomain | 'all';

/** Whether a scope already has fresh data (pure). */
export function cacheHasScope(
  loadedScopes: ReadonlySet<CacheScope>,
  scope: CacheScope,
): boolean {
  if (loadedScopes.has('all')) return true;
  return loadedScopes.has(scope);
}

/** Scopes that need a network fetch (pure). */
export function scopesToFetch(
  loadedScopes: ReadonlySet<CacheScope>,
  requested: CacheScope,
): CacheScope | null {
  return cacheHasScope(loadedScopes, requested) ? null : requested;
}

export function upsertSubscription(
  rows: ReadonlyArray<EventSubscription>,
  created: EventSubscription,
): EventSubscription[] {
  const without = rows.filter((row) => row.id !== created.id);
  return [created, ...without];
}

export function removeSubscriptionById(
  rows: ReadonlyArray<EventSubscription>,
  id: string,
): EventSubscription[] {
  return rows.filter((row) => row.id !== id);
}

export function findInCache(
  rows: ReadonlyArray<EventSubscription>,
  targetType: TargetType,
  targetId: string,
): EventSubscription | undefined {
  return findSubscription([...rows], targetType, targetId);
}

/** Merge a fetched page into cache; prefer newer by id. */
export function mergeFetchedRows(
  existing: ReadonlyArray<EventSubscription>,
  fetched: ReadonlyArray<EventSubscription>,
): EventSubscription[] {
  const byId = new Map<string, EventSubscription>();
  for (const row of existing) byId.set(row.id, row);
  for (const row of fetched) byId.set(row.id, row);
  return [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
