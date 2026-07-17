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
  let cacheEpoch = 0;

  const allRows = computed(() => rows.value);

  function assertOwner() {
    const session = useSessionStore();
    const uid = session.actAsUserId ?? session.userId ?? null;
    if (ownerUserId.value !== null && ownerUserId.value !== uid) {
      invalidate();
    }
    return uid;
  }

  async function ensureLoaded(scope: CacheScope = 'all') {
    const uid = assertOwner();
    const epoch = cacheEpoch;
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
        const current = useSessionStore();
        const currentUid = current.actAsUserId ?? current.userId ?? null;
        if (epoch !== cacheEpoch || uid !== currentUid) return;
        rows.value = mergeFetchedRows(rows.value, fetched);
        loadedScopes.value = new Set([...loadedScopes.value, need]);
        ownerUserId.value = uid;
      } catch (e) {
        if (epoch === cacheEpoch) {
          error.value = e instanceof Error ? e.message : 'Ошибка подписки';
        }
        throw e;
      } finally {
        if (epoch === cacheEpoch) {
          const next = new Set(loadingScopes.value);
          next.delete(need);
          loadingScopes.value = next;
        }
        if (epoch === cacheEpoch) inflight.delete(need);
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
    const uid = assertOwner();
    const epoch = cacheEpoch;
    error.value = null;
    const created = await createEventSubscription(input);
    const session = useSessionStore();
    if (epoch !== cacheEpoch || uid !== (session.actAsUserId ?? session.userId ?? null)) {
      return created;
    }
    rows.value = upsertSubscription(rows.value, created);
    loadedScopes.value = new Set([...loadedScopes.value, input.sourceDomain, 'all']);
    return created;
  }

  async function unsubscribe(id: string) {
    const uid = assertOwner();
    const epoch = cacheEpoch;
    error.value = null;
    await deleteEventSubscription(id);
    const session = useSessionStore();
    if (epoch !== cacheEpoch || uid !== (session.actAsUserId ?? session.userId ?? null)) return;
    rows.value = removeSubscriptionById(rows.value, id);
  }

  /** Drop cache (e.g. after logout). */
  function invalidate() {
    cacheEpoch += 1;
    rows.value = [];
    loadedScopes.value = new Set();
    loadingScopes.value = new Set();
    ownerUserId.value = null;
    inflight.clear();
    error.value = null;
  }

  /** Replace cache from a full list fetch (Subscriptions page). */
  function replaceAll(data: EventSubscription[]) {
    const session = useSessionStore();
    rows.value = [...data].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    loadedScopes.value = new Set(['all']);
    ownerUserId.value = session.actAsUserId ?? session.userId ?? null;
    error.value = null;
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
