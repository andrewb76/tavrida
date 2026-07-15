import {
  createEventSubscription,
  deleteEventSubscription,
  listEventSubscriptions,
  type EventSubscription,
  type SourceDomain,
  type TargetType,
} from '@/services/subscriptions';
import {
  mergeFetchedRows,
  removeSubscriptionById,
  scopesToFetch,
  upsertSubscription,
  type CacheScope,
} from '@/services/subscription-cache.logic';
import { findSubscription } from '@/services/subscription-helpers';
import { useSessionStore } from '@/stores/session';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

/**
 * Shared cache for event subscriptions so N tag chips / lot buttons
 * share one GET /subscriptions per domain instead of N parallel fetches.
 */
export const useSubscriptionsStore = defineStore('subscriptions', () => {
  const rows = ref<EventSubscription[]>([]);
  const loadedScopes = ref<Set<CacheScope>>(new Set());
  const loadingScopes = ref<Set<CacheScope>>(new Set());
  const ownerUserId = ref<string | null>(null);
  const inflight = new Map<CacheScope, Promise<void>>();
  const error = ref<string | null>(null);

  const allRows = computed(() => rows.value);

  function assertOwner() {
    const session = useSessionStore();
    const uid = session.userId ?? null;
    if (ownerUserId.value && uid && ownerUserId.value !== uid) {
      invalidate();
    }
  }

  async function ensureLoaded(scope: CacheScope = 'all') {
    assertOwner();
    const need = scopesToFetch(loadedScopes.value, scope);
    if (!need) return;

    const existing = inflight.get(need);
    if (existing) {
      await existing;
      return;
    }

    const run = (async () => {
      loadingScopes.value = new Set([...loadingScopes.value, need]);
      error.value = null;
      try {
        const fetched =
          need === 'all'
            ? await listEventSubscriptions()
            : await listEventSubscriptions(need);
        rows.value = mergeFetchedRows(rows.value, fetched);
        loadedScopes.value = new Set([...loadedScopes.value, need]);
        ownerUserId.value = useSessionStore().userId ?? null;
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'Ошибка подписки';
        throw e;
      } finally {
        const next = new Set(loadingScopes.value);
        next.delete(need);
        loadingScopes.value = next;
        inflight.delete(need);
      }
    })();

    inflight.set(need, run);
    await run;
  }

  function isLoading(scope: CacheScope = 'all'): boolean {
    if (loadingScopes.value.has(scope)) return true;
    if (scope !== 'all' && loadingScopes.value.has('all')) return true;
    return false;
  }

  function find(targetType: TargetType, targetId: string) {
    return findSubscription(rows.value, targetType, targetId);
  }

  async function subscribe(input: {
    sourceDomain: SourceDomain;
    targetType: TargetType;
    targetId: string;
    options?: Record<string, unknown>;
  }) {
    const created = await createEventSubscription(input);
    rows.value = upsertSubscription(rows.value, created);
    loadedScopes.value = new Set([...loadedScopes.value, input.sourceDomain, 'all']);
    return created;
  }

  async function unsubscribe(id: string) {
    await deleteEventSubscription(id);
    rows.value = removeSubscriptionById(rows.value, id);
  }

  /** Drop cache (e.g. after logout). */
  function invalidate() {
    rows.value = [];
    loadedScopes.value = new Set();
    loadingScopes.value = new Set();
    ownerUserId.value = null;
    inflight.clear();
    error.value = null;
  }

  /** Replace cache from a full list fetch (Subscriptions page). */
  function replaceAll(data: EventSubscription[]) {
    rows.value = [...data].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    loadedScopes.value = new Set(['all']);
  }

  return {
    allRows,
    error,
    ensureLoaded,
    isLoading,
    find,
    subscribe,
    unsubscribe,
    invalidate,
    replaceAll,
  };
});
