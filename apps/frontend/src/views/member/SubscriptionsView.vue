<script setup lang="ts">
import {
  deleteEventSubscription,
  getDeliveryPreference,
  listEventSubscriptions,
  sourceDomainLabel,
  subscriptionHref,
  targetTypeLabel,
  updateDeliveryPreference,
  type DeliveryPreference,
  type EventSubscription,
  type SourceDomain,
} from '@/services/subscriptions';
import { UiButton } from '@tavrida/ui';
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { toast } from 'vue-sonner';

type FilterKey = 'all' | SourceDomain;

const rows = ref<EventSubscription[]>([]);
const delivery = ref<DeliveryPreference | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const filter = ref<FilterKey>('all');
const busyId = ref<string | null>(null);
const savingDelivery = ref(false);

const filters: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'Все' },
  { key: 'forum', label: 'Форум' },
  { key: 'auction', label: 'Аукцион' },
  { key: 'platform', label: 'Теги' },
  { key: 'marketplace', label: 'Маркет' },
];

const filtered = computed(() => {
  if (filter.value === 'all') return rows.value;
  return rows.value.filter((row) => row.sourceDomain === filter.value);
});

const grouped = computed(() => {
  const map = new Map<string, EventSubscription[]>();
  for (const row of filtered.value) {
    const key = row.targetType;
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }
  return [...map.entries()].map(([targetType, items]) => ({
    targetType: targetType as EventSubscription['targetType'],
    items: items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  }));
});

onMounted(loadAll);

async function loadAll() {
  loading.value = true;
  error.value = null;
  try {
    const [subs, prefs] = await Promise.all([
      listEventSubscriptions(),
      getDeliveryPreference(),
    ]);
    rows.value = subs;
    delivery.value = prefs;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить подписки';
  } finally {
    loading.value = false;
  }
}

async function unsubscribe(row: EventSubscription) {
  busyId.value = row.id;
  try {
    await deleteEventSubscription(row.id);
    rows.value = rows.value.filter((r) => r.id !== row.id);
    toast.success('Подписка отменена');
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Не удалось отписаться');
  } finally {
    busyId.value = null;
  }
}

async function patchDelivery(
  patch: Partial<{
    emailDigestEnabled: boolean;
    pushEnabled: boolean;
    digestFrequency: 'DAILY' | 'WEEKLY';
  }>,
) {
  if (!delivery.value || savingDelivery.value) return;
  savingDelivery.value = true;
  try {
    delivery.value = await updateDeliveryPreference(patch);
    toast.success('Настройки сохранены');
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Не удалось сохранить');
    // reload to reset toggles
    delivery.value = await getDeliveryPreference().catch(() => delivery.value);
  } finally {
    savingDelivery.value = false;
  }
}

function shortId(id: string | null): string {
  if (!id) return '—';
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}
</script>

<template>
  <section class="subs">
    <header class="subs__header">
      <h1>Подписки</h1>
      <p class="subs__lead">
        Темы, лоты и теги, по которым вы хотите получать уведомления.
      </p>
    </header>

    <p
      v-if="loading"
      class="subs__muted"
    >
      Загрузка…
    </p>
    <p
      v-else-if="error"
      class="subs__error"
    >
      {{ error }}
    </p>

    <template v-else>
      <section
        v-if="delivery"
        class="subs__card"
        aria-labelledby="subs-delivery-title"
      >
        <h2 id="subs-delivery-title">
          Доставка
        </h2>
        <div class="subs__prefs">
          <label class="subs__switch">
            <input
              type="checkbox"
              :checked="delivery.pushEnabled"
              :disabled="savingDelivery"
              @change="
                patchDelivery({
                  pushEnabled: ($event.target as HTMLInputElement).checked,
                })
              "
            >
            <span>Push / in-app</span>
          </label>
          <label class="subs__switch">
            <input
              type="checkbox"
              :checked="delivery.emailDigestEnabled"
              :disabled="savingDelivery"
              @change="
                patchDelivery({
                  emailDigestEnabled: ($event.target as HTMLInputElement).checked,
                })
              "
            >
            <span>Email digest</span>
            <span class="subs__hint">Pro</span>
          </label>
          <label class="subs__select">
            <span>Частота digest</span>
            <select
              :value="delivery.digestFrequency"
              :disabled="savingDelivery || !delivery.emailDigestEnabled"
              @change="
                patchDelivery({
                  digestFrequency: ($event.target as HTMLSelectElement).value as
                    | 'DAILY'
                    | 'WEEKLY',
                })
              "
            >
              <option value="DAILY">Ежедневно</option>
              <option value="WEEKLY">Еженедельно</option>
            </select>
          </label>
        </div>
      </section>

      <div
        class="subs__filters"
        role="tablist"
        aria-label="Фильтр по домену"
      >
        <button
          v-for="item in filters"
          :key="item.key"
          type="button"
          role="tab"
          class="subs__chip"
          :class="{ 'is-active': filter === item.key }"
          :aria-selected="filter === item.key"
          @click="filter = item.key"
        >
          {{ item.label }}
        </button>
      </div>

      <p
        v-if="!filtered.length"
        class="subs__muted"
      >
        Пока нет подписок.
        <RouterLink to="/forum">
          Открыть форум
        </RouterLink>
        или
        <RouterLink to="/auctions">
          аукционы
        </RouterLink>
        и нажмите «Подписаться».
      </p>

      <div
        v-for="group in grouped"
        :key="group.targetType"
        class="subs__group"
      >
        <h2>{{ targetTypeLabel(group.targetType) }}</h2>
        <ul class="subs__list">
          <li
            v-for="row in group.items"
            :key="row.id"
            class="subs__row"
          >
            <div class="subs__meta">
              <span class="subs__domain">{{ sourceDomainLabel(row.sourceDomain) }}</span>
              <RouterLink
                v-if="subscriptionHref(row)"
                :to="subscriptionHref(row)!"
                class="subs__target"
              >
                {{ shortId(row.targetId) }}
              </RouterLink>
              <span
                v-else
                class="subs__target"
              >{{ shortId(row.targetId) }}</span>
              <time class="subs__date">{{
                new Date(row.createdAt).toLocaleString('ru-RU')
              }}</time>
            </div>
            <UiButton
              intent="ghost"
              size="sm"
              type="button"
              :disabled="busyId === row.id"
              @click="unsubscribe(row)"
            >
              Отписаться
            </UiButton>
          </li>
        </ul>
      </div>
    </template>
  </section>
</template>

<style scoped>
.subs {
  display: grid;
  gap: 1.25rem;
}

.subs__header h1 {
  margin: 0;
  font-size: 1.5rem;
}

.subs__lead {
  margin: 0.35rem 0 0;
  color: var(--color-text-muted, #666);
  font-size: 0.9375rem;
}

.subs__muted {
  margin: 0;
  color: var(--color-text-muted, #666);
}

.subs__muted a {
  color: var(--color-primary, #2563eb);
}

.subs__error {
  margin: 0;
  color: var(--color-danger, #b91c1c);
}

.subs__card {
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 0.5rem;
  background: var(--color-surface, #fff);
}

.subs__card h2 {
  margin: 0;
  font-size: 1rem;
}

.subs__prefs {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 1.5rem;
  align-items: center;
}

.subs__switch,
.subs__select {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.875rem;
}

.subs__hint {
  font-size: 0.7rem;
  color: var(--color-primary, #2563eb);
  border: 1px solid color-mix(in srgb, var(--color-primary, #2563eb) 40%, transparent);
  border-radius: 0.25rem;
  padding: 0 0.3rem;
}

.subs__select select {
  font: inherit;
  font-size: 0.875rem;
  height: 2rem;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 0.375rem;
  padding: 0 0.5rem;
  background: transparent;
}

.subs__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.subs__chip {
  height: 2rem;
  padding: 0 0.75rem;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 999px;
  background: transparent;
  font: inherit;
  font-size: 0.8125rem;
  cursor: pointer;
  color: inherit;
}

.subs__chip.is-active {
  border-color: var(--color-primary, #2563eb);
  background: color-mix(in srgb, var(--color-primary, #2563eb) 12%, transparent);
  color: var(--color-primary, #2563eb);
}

.subs__group {
  display: grid;
  gap: 0.5rem;
}

.subs__group h2 {
  margin: 0;
  font-size: 0.9375rem;
  color: var(--color-text-muted, #555);
}

.subs__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.35rem;
}

.subs__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--color-border, #eee);
  border-radius: 0.5rem;
}

.subs__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.35rem 0.75rem;
  min-width: 0;
  font-size: 0.875rem;
}

.subs__domain {
  font-weight: 600;
}

.subs__target {
  font-family: ui-monospace, monospace;
  font-size: 0.8125rem;
  color: var(--color-primary, #2563eb);
  text-decoration: none;
}

.subs__target:not(a) {
  color: var(--color-text-muted, #666);
}

.subs__date {
  color: var(--color-text-muted, #888);
  font-size: 0.75rem;
}
</style>
