<script setup lang="ts">
import {
  fetchAdminUserWalletTransactions,
  type AdminWalletTransaction,
} from '@/services/adminUsers';
import { formatTransactionAmount } from '@/services/wallet';
import { UiButton } from '@tavrida/ui';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const userId = computed(() => String(route.params.userId ?? ''));
const label = computed(() => String(route.query.label ?? userId.value));

const transactions = ref<AdminWalletTransaction[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(load);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    transactions.value = await fetchAdminUserWalletTransactions(userId.value, 100);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить историю';
  } finally {
    loading.value = false;
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function typeLabel(type: string): string {
  if (type === 'DEPOSIT') return 'Пополнение';
  if (type === 'CHARGE') return 'Списание';
  return type;
}
</script>

<template>
  <section class="space-y-4 pb-24">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <button
          type="button"
          class="mb-1 text-sm text-text-muted hover:text-text"
          @click="router.push({ name: 'admin-users' })"
        >
          ← Пользователи
        </button>
        <h2 class="text-lg font-semibold">
          История кошелька
        </h2>
        <p class="text-sm text-text-muted">
          {{ label }}
        </p>
        <code class="mt-0.5 block text-xs text-text-muted">{{ userId }}</code>
      </div>
      <UiButton
        intent="secondary"
        type="button"
        :disabled="loading"
        @click="load"
      >
        Обновить
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
      class="text-sm text-danger"
    >
      {{ error }}
    </p>
    <p
      v-else-if="transactions.length === 0"
      class="text-sm text-text-muted"
    >
      Нет операций.
    </p>
    <ul
      v-else
      class="divide-y divide-border rounded-lg border border-border bg-surface"
    >
      <li
        v-for="tx in transactions"
        :key="tx.id"
        class="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2.5 text-sm"
      >
        <div class="min-w-0">
          <p class="font-medium text-text">
            {{ typeLabel(tx.type) }}
            <span class="font-normal text-text-muted">· {{ tx.description || '—' }}</span>
          </p>
          <p class="text-xs text-text-muted">
            {{ formatDate(tx.createdAt) }}
            <span v-if="tx.target"> · {{ tx.target }}</span>
          </p>
        </div>
        <p
          class="shrink-0 tabular-nums font-semibold"
          :class="tx.amount >= 0 ? 'text-emerald-700' : 'text-text'"
        >
          {{ formatTransactionAmount(tx) }}
        </p>
      </li>
    </ul>
  </section>
</template>
