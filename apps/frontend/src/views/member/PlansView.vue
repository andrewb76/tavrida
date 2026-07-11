<script setup lang="ts">
import {
  activatePlan,
  formatPlanPrice,
  getSubscription,
  listPlans,
  type PlanSummary,
  type UserSubscription,
} from '@/services/plans';
import { formatMoney, getBalance } from '@/services/wallet';
import { UiButton, UiModal } from '@tavrida/ui';
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';

const plans = ref<PlanSummary[]>([]);
const subscription = ref<UserSubscription | null>(null);
const balance = ref(0);
const loading = ref(true);
const error = ref<string | null>(null);

const activateOpen = ref(false);
const selectedPlan = ref<PlanSummary | null>(null);
const billingPeriod = ref<'monthly' | 'yearly'>('monthly');
const autoRenew = ref(true);
const activating = ref(false);
const activateError = ref<string | null>(null);
const successMessage = ref<string | null>(null);

const selectedPrice = computed(() => {
  if (!selectedPlan.value) return 0;
  return billingPeriod.value === 'yearly'
    ? selectedPlan.value.yearlyPrice
    : selectedPlan.value.monthlyPrice;
});

const balanceAfter = computed(() => balance.value - selectedPrice.value);

onMounted(async () => {
  try {
    const [planRows, sub, wallet] = await Promise.all([
      listPlans(),
      getSubscription(),
      getBalance(),
    ]);
    plans.value = planRows;
    subscription.value = sub;
    balance.value = wallet.balance;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить тарифы';
  } finally {
    loading.value = false;
  }
});

function openActivate(plan: PlanSummary) {
  if (subscription.value?.planId === plan.id) return;
  selectedPlan.value = plan;
  billingPeriod.value = 'monthly';
  autoRenew.value = plan.id !== 'free';
  activateError.value = null;
  activateOpen.value = true;
}

async function confirmActivate() {
  if (!selectedPlan.value) return;
  activating.value = true;
  activateError.value = null;

  try {
    const result = await activatePlan({
      planId: selectedPlan.value.id,
      autoRenew: autoRenew.value,
      billingPeriod: billingPeriod.value,
    });
    subscription.value = result;
    if (result.billingCharged) {
      balance.value = balanceAfter.value;
    }
    successMessage.value = `Тариф «${selectedPlan.value.title}» активирован`;
    activateOpen.value = false;
  } catch (e) {
    activateError.value = e instanceof Error ? e.message : 'Ошибка активации';
  } finally {
    activating.value = false;
  }
}

function expiresLabel(expiresAt: string | null): string {
  if (!expiresAt) return 'без срока';
  return new Date(expiresAt).toLocaleDateString('ru-RU');
}
</script>

<template>
  <section class="space-y-8">
    <div>
      <p class="text-xs font-medium uppercase text-accent">W08</p>
      <h1 class="text-3xl font-semibold">Тарифы</h1>
      <p class="mt-2 text-text-muted">Free / Basic / Pro — лимиты и возможности по плану.</p>
    </div>

    <p v-if="loading" class="text-text-muted">Загрузка…</p>
    <p v-else-if="error" class="text-danger">{{ error }}</p>

    <p v-if="successMessage" class="rounded-lg border border-border bg-surface px-4 py-3 text-sm">
      {{ successMessage }}
    </p>

    <div
      v-if="subscription && !loading"
      class="rounded-lg border border-border bg-surface p-4 shadow-card"
    >
      <p class="text-sm text-text-muted">Текущий план</p>
      <p class="mt-1 text-lg font-medium capitalize">{{ subscription.planId }}</p>
      <p v-if="subscription.expiresAt" class="mt-1 text-sm text-text-muted">
        до {{ expiresLabel(subscription.expiresAt) }}
        <span v-if="subscription.autoRenew"> · автопродление</span>
      </p>
      <p class="mt-2 text-sm">
        Баланс:
        <RouterLink to="/wallet" class="font-medium text-primary hover:underline">
          {{ formatMoney(balance) }}
        </RouterLink>
      </p>
    </div>

    <ul v-if="!loading && !error" class="grid gap-4 md:grid-cols-3">
      <li
        v-for="plan in plans"
        :key="plan.id"
        class="flex flex-col rounded-lg border border-border bg-surface p-5 shadow-card"
        :class="subscription?.planId === plan.id ? 'ring-2 ring-primary' : ''"
      >
        <h2 class="text-xl font-semibold">{{ plan.title }}</h2>
        <p class="mt-2 flex-1 text-sm text-text-muted">{{ plan.description }}</p>
        <p class="mt-4 text-2xl font-semibold tabular-nums">
          {{ formatPlanPrice(plan, 'monthly') }}
        </p>
        <p v-if="plan.yearlyPrice > 0" class="text-sm text-text-muted">
          или {{ formatPlanPrice(plan, 'yearly') }}
        </p>
        <UiButton
          class="mt-4 w-full"
          :intent="subscription?.planId === plan.id ? 'secondary' : 'primary'"
          :disabled="subscription?.planId === plan.id"
          @click="openActivate(plan)"
        >
          {{
            subscription?.planId === plan.id
              ? 'Текущий план'
              : plan.id === 'free'
                ? 'Перейти на Free'
                : `Активировать ${plan.title}`
          }}
        </UiButton>
      </li>
    </ul>

    <UiModal
      v-model:open="activateOpen"
      :title="selectedPlan ? `Активировать ${selectedPlan.title}` : 'Активация'"
      description="Списание с кошелька"
    >
      <div v-if="selectedPlan" class="space-y-4">
        <div v-if="selectedPlan.monthlyPrice > 0" class="flex gap-2">
          <UiButton
            :intent="billingPeriod === 'monthly' ? 'primary' : 'secondary'"
            @click="billingPeriod = 'monthly'"
          >
            Месяц
          </UiButton>
          <UiButton
            :intent="billingPeriod === 'yearly' ? 'primary' : 'secondary'"
            @click="billingPeriod = 'yearly'"
          >
            Год
          </UiButton>
        </div>

        <p class="text-lg font-medium tabular-nums">
          {{ formatPlanPrice(selectedPlan, billingPeriod) }}
        </p>

        <p v-if="selectedPrice > 0" class="text-sm text-text-muted">
          Баланс: {{ formatMoney(balance) }} → после списания
          <span :class="balanceAfter < 0 ? 'text-danger font-medium' : ''">
            {{ formatMoney(balanceAfter) }}
          </span>
        </p>

        <label v-if="selectedPlan.id !== 'free'" class="flex items-center gap-2 text-sm">
          <input v-model="autoRenew" type="checkbox" class="size-4" />
          Автопродление
        </label>

        <p v-if="activateError" class="text-sm text-danger">{{ activateError }}</p>

        <p v-if="balanceAfter < 0" class="text-sm text-danger">
          Недостаточно средств.
          <RouterLink to="/wallet" class="text-primary underline" @click="activateOpen = false">
            Пополнить кошелёк
          </RouterLink>
        </p>

        <UiButton
          intent="primary"
          class="w-full"
          :disabled="activating || (selectedPrice > 0 && balanceAfter < 0)"
          @click="confirmActivate"
        >
          {{ activating ? 'Активация…' : 'Активировать' }}
        </UiButton>
      </div>
    </UiModal>
  </section>
</template>
