<script setup lang="ts">
import { UiButton } from '@tavrida/ui';
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { toast } from 'vue-sonner';
import {
  ORDER_ACTION_LABELS,
  ORDER_STATUS_LABELS,
  getMarketplaceListing,
  listOrders,
  orderActionsForRole,
  updateOrderStatus,
  type MarketplaceOrder,
  type OrderStatus,
} from '@/services/marketplace';
import { useSessionStore } from '@/stores/session';

const session = useSessionStore();
const role = ref<'provider' | 'customer'>('customer');
const loading = ref(true);
const error = ref('');
const orders = ref<MarketplaceOrder[]>([]);
const listingTitles = ref<Record<string, string>>({});
const updatingId = ref<string | null>(null);
let loadGeneration = 0;

const emptyMessage = computed(() =>
  role.value === 'customer'
    ? 'У вас пока нет заказов услуг.'
    : 'Пока никто не заказал ваши услуги.',
);

async function loadListingTitles(rows: MarketplaceOrder[]) {
  const ids = [...new Set(rows.map((o) => o.listingId))];
  const missing = ids.filter((id) => !listingTitles.value[id]);
  if (!missing.length) return;

  const entries = await Promise.all(
    missing.map(async (id) => {
      try {
        const listing = await getMarketplaceListing(id);
        return [id, listing.title] as const;
      } catch {
        return [id, 'Услуга'] as const;
      }
    }),
  );
  listingTitles.value = {
    ...listingTitles.value,
    ...Object.fromEntries(entries),
  };
}

async function load() {
  const generation = ++loadGeneration;
  const selectedRole = role.value;
  loading.value = true;
  error.value = '';
  orders.value = [];
  try {
    const rows = await listOrders(selectedRole);
    if (generation !== loadGeneration || selectedRole !== role.value) return;
    orders.value = rows;
    await loadListingTitles(rows);
  } catch (e) {
    if (generation !== loadGeneration) return;
    error.value = e instanceof Error ? e.message : 'Ошибка загрузки';
  } finally {
    if (generation === loadGeneration) loading.value = false;
  }
}

function counterpartyId(order: MarketplaceOrder): string {
  return role.value === 'provider' ? order.customerId : order.providerId;
}

function counterpartyLabel(): string {
  return role.value === 'provider' ? 'Заказчик' : 'Исполнитель';
}

function profilePath(userId: string): string {
  return userId === session.userId ? '/profile/me' : `/profile/${userId}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function actionsFor(order: MarketplaceOrder): OrderStatus[] {
  return orderActionsForRole(order.status, role.value);
}

async function applyStatus(orderId: string, status: OrderStatus) {
  updatingId.value = orderId;
  try {
    const updated = await updateOrderStatus(orderId, status);
    orders.value = orders.value.map((o) => (o.id === orderId ? updated : o));
    toast.success(`Статус: ${ORDER_STATUS_LABELS[status]}`);
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Не удалось обновить статус');
  } finally {
    updatingId.value = null;
  }
}

watch(role, load);
onMounted(load);
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">
          Заказы
        </h1>
        <p class="mt-1 text-sm text-text-muted">
          Заказы услуг маркета — как заказчик или исполнитель.
        </p>
      </div>
      <RouterLink to="/marketplace">
        <UiButton
          size="sm"
          intent="secondary"
          type="button"
        >
          К каталогу
        </UiButton>
      </RouterLink>
    </header>

    <div class="flex flex-wrap gap-2">
      <UiButton
        :intent="role === 'customer' ? 'primary' : 'secondary'"
        size="sm"
        type="button"
        @click="role = 'customer'"
      >
        Я заказчик
      </UiButton>
      <UiButton
        :intent="role === 'provider' ? 'primary' : 'secondary'"
        size="sm"
        type="button"
        @click="role = 'provider'"
      >
        Я исполнитель
      </UiButton>
    </div>

    <p
      v-if="loading"
      class="text-sm text-text-muted"
    >
      Загрузка…
    </p>
    <p
      v-else-if="error"
      class="text-sm text-error"
    >
      {{ error }}
    </p>
    <p
      v-else-if="!orders.length"
      class="text-sm text-text-muted"
    >
      {{ emptyMessage }}
    </p>

    <ul
      v-else
      class="divide-y divide-border rounded-md border border-border"
    >
      <li
        v-for="order in orders"
        :key="order.id"
        class="space-y-3 p-4"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="space-y-1">
            <RouterLink
              :to="`/marketplace/${order.listingId}`"
              class="font-medium text-primary hover:underline"
            >
              {{ listingTitles[order.listingId] ?? 'Услуга' }}
            </RouterLink>
            <p class="text-sm text-text-muted">
              {{ order.agreedPrice.toLocaleString('ru-RU') }} {{ order.currency }}
              · {{ formatDate(order.createdAt) }}
            </p>
            <p
              v-if="order.note"
              class="text-sm"
            >
              {{ order.note }}
            </p>
          </div>
          <span
            class="rounded-full bg-surface px-2 py-0.5 text-xs font-medium"
            :class="{
              'text-warning': order.status === 'PENDING',
              'text-primary': order.status === 'ACCEPTED' || order.status === 'IN_PROGRESS',
              'text-success': order.status === 'COMPLETED',
              'text-error': order.status === 'CANCELLED' || order.status === 'DISPUTED',
            }"
          >
            {{ ORDER_STATUS_LABELS[order.status] }}
          </span>
        </div>

        <p class="text-sm text-text-muted">
          {{ counterpartyLabel() }}:
          <RouterLink
            :to="profilePath(counterpartyId(order))"
            class="text-primary hover:underline"
          >
            профиль
          </RouterLink>
        </p>

        <div
          v-if="actionsFor(order).length"
          class="flex flex-wrap gap-2"
        >
          <UiButton
            v-for="action in actionsFor(order)"
            :key="action"
            size="sm"
            :intent="action === 'CANCELLED' ? 'secondary' : 'primary'"
            type="button"
            :disabled="updatingId === order.id"
            @click="applyStatus(order.id, action)"
          >
            {{ ORDER_ACTION_LABELS[action] }}
          </UiButton>
        </div>
      </li>
    </ul>
  </div>
</template>
