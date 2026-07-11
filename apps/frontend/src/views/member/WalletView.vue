<script setup lang="ts">
import { refreshSessionBalance } from '@/composables/useWalletBalance';
import { cancelAutoRenew, getSubscription } from '@/services/plans';
import {
  deposit,
  formatMoney,
  formatTransactionAmount,
  getBalance,
  listTransactions,
  type WalletTransaction,
} from '@/services/wallet';
import { UiButton, UiModal } from '@tavrida/ui';
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';

const balance = ref(0);
const currency = ref('RUB');
const subscriptionPlanId = ref('free');
const subscriptionExpires = ref<string | null>(null);
const autoRenew = ref(false);
const transactions = ref<WalletTransaction[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const depositOpen = ref(false);
const depositAmount = ref(1000);
const depositing = ref(false);
const depositError = ref<string | null>(null);

const presets = [500, 1000, 2000];

onMounted(loadAll);

async function loadAll() {
  loading.value = true;
  error.value = null;
  try {
    const [wallet, sub, txs] = await Promise.all([
      getBalance(),
      getSubscription(),
      listTransactions(),
    ]);
    balance.value = wallet.balance;
    currency.value = wallet.currency;
    subscriptionPlanId.value = sub.planId;
    subscriptionExpires.value = sub.expiresAt;
    autoRenew.value = sub.autoRenew;
    transactions.value = txs;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить кошелёк';
  } finally {
    loading.value = false;
  }
}

async function confirmDeposit() {
  depositing.value = true;
  depositError.value = null;
  try {
    const result = await deposit(depositAmount.value);
    balance.value = result.balanceAfter;
    await refreshSessionBalance();
    transactions.value = await listTransactions();
    depositOpen.value = false;
  } catch (e) {
    depositError.value = e instanceof Error ? e.message : 'Ошибка пополнения';
  } finally {
    depositing.value = false;
  }
}

async function toggleAutoRenewOff() {
  try {
    await cancelAutoRenew();
    autoRenew.value = false;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось отключить автопродление';
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
</script>

<template>
  <section class="space-y-8">
    <div>
      <p class="text-xs font-medium uppercase text-accent">W08</p>
      <h1 class="text-3xl font-semibold">Кошелёк</h1>
      <p class="mt-2 text-text-muted">Баланс, пополнение и история операций.</p>
    </div>

    <p v-if="loading" class="text-text-muted">Загрузка…</p>
    <p v-else-if="error" class="text-danger">{{ error }}</p>

    <template v-if="!loading && !error">
      <div class="rounded-lg border border-border bg-surface p-5 shadow-card">
        <p class="text-sm text-text-muted">Баланс</p>
        <p class="mt-1 text-3xl font-semibold tabular-nums">
          {{ formatMoney(balance, currency) }}
        </p>
        <UiButton intent="primary" class="mt-4" @click="depositOpen = true">Пополнить</UiButton>
      </div>

      <div class="rounded-lg border border-border bg-surface p-5 shadow-card">
        <p class="text-sm text-text-muted">Подписка</p>
        <p class="mt-1 text-lg font-medium capitalize">{{ subscriptionPlanId }}</p>
        <p v-if="subscriptionExpires" class="mt-1 text-sm text-text-muted">
          до {{ new Date(subscriptionExpires).toLocaleDateString('ru-RU') }}
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <RouterLink to="/plans">
            <UiButton intent="secondary">Сменить тариф</UiButton>
          </RouterLink>
          <UiButton v-if="autoRenew" intent="secondary" @click="toggleAutoRenewOff">
            Отключить автопродление
          </UiButton>
        </div>
      </div>

      <div>
        <h2 class="mb-3 text-lg font-medium">История операций</h2>
        <p v-if="transactions.length === 0" class="text-sm text-text-muted">
          Операций пока нет
        </p>
        <ul v-else class="divide-y divide-border rounded-lg border border-border bg-surface">
          <li
            v-for="tx in transactions"
            :key="tx.id"
            class="flex items-start justify-between gap-4 px-4 py-3 text-sm"
          >
            <div>
              <p>{{ tx.description }}</p>
              <p class="text-text-muted">{{ formatDate(tx.createdAt) }}</p>
            </div>
            <p class="shrink-0 font-medium tabular-nums">{{ formatTransactionAmount(tx) }}</p>
          </li>
        </ul>
      </div>
    </template>

    <UiModal v-model:open="depositOpen" title="Пополнение баланса" description="Локально — мгновенное зачисление">
      <div class="space-y-4">
        <div class="flex flex-wrap gap-2">
          <UiButton
            v-for="preset in presets"
            :key="preset"
            :intent="depositAmount === preset ? 'primary' : 'secondary'"
            @click="depositAmount = preset"
          >
            {{ formatMoney(preset) }}
          </UiButton>
        </div>

        <label class="block text-sm">
          Сумма (₽)
          <input
            v-model.number="depositAmount"
            type="number"
            min="100"
            step="100"
            class="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2"
          />
        </label>

        <p v-if="depositError" class="text-sm text-danger">{{ depositError }}</p>

        <UiButton
          intent="primary"
          class="w-full"
          :disabled="depositing || depositAmount < 100"
          @click="confirmDeposit"
        >
          {{ depositing ? 'Пополнение…' : `Пополнить ${formatMoney(depositAmount)}` }}
        </UiButton>
      </div>
    </UiModal>
  </section>
</template>
