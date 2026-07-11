<script setup lang="ts">
import { getPlanDetails } from '@/config/planDetails';
import {
  activatePlan,
  formatPlanPrice,
  getSubscription,
  listPlans,
  type PlanSummary,
  type UserSubscription,
} from '@/services/plans';
import { formatMoney, getBalance } from '@/services/wallet';
import { useSessionStore } from '@/stores/session';
import { UiButton, UiModal } from '@tavrida/ui';
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';

const plans = ref<PlanSummary[]>([]);
const session = useSessionStore();
const subscription = ref<UserSubscription | null>(null);
const balance = ref(0);
const loading = ref(true);
const error = ref<string | null>(null);
const billingPeriod = ref<'monthly' | 'yearly'>('monthly');

const activateOpen = ref(false);
const selectedPlan = ref<PlanSummary | null>(null);
const activateBillingPeriod = ref<'monthly' | 'yearly'>('monthly');
const autoRenew = ref(true);
const activating = ref(false);
const activateError = ref<string | null>(null);
const successMessage = ref<string | null>(null);

const selectedPrice = computed(() => {
  if (!selectedPlan.value) return 0;
  return activateBillingPeriod.value === 'yearly'
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
    session.setBalance(wallet.balance, wallet.currency);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить тарифы';
  } finally {
    loading.value = false;
  }
});

function openActivate(plan: PlanSummary) {
  if (subscription.value?.planId === plan.id) return;
  selectedPlan.value = plan;
  activateBillingPeriod.value = billingPeriod.value;
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
      billingPeriod: activateBillingPeriod.value,
    });
    subscription.value = result;
    if (result.billingCharged) {
      balance.value = balanceAfter.value;
      session.setBalance(balanceAfter.value);
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

function yearlySavings(plan: PlanSummary): number | null {
  if (plan.monthlyPrice <= 0 || plan.yearlyPrice <= 0) return null;
  const monthlyTotal = plan.monthlyPrice * 12;
  if (monthlyTotal <= plan.yearlyPrice) return null;
  return monthlyTotal - plan.yearlyPrice;
}
</script>

<template>
  <section class="space-y-8">
    <div>
      <p class="text-xs font-medium uppercase text-accent">
        W08
      </p>
      <h1 class="text-3xl font-semibold">
        Тарифы
      </h1>
      <p class="mt-2 max-w-2xl text-text-muted">
        Сравните лимиты и возможности. Оплата списывается с кошелька — пополнить можно в любой момент.
      </p>
    </div>

    <p
      v-if="loading"
      class="text-text-muted"
    >
      Загрузка…
    </p>
    <p
      v-else-if="error"
      class="text-danger"
    >
      {{ error }}
    </p>

    <p
      v-if="successMessage"
      class="rounded-lg border border-border bg-surface px-4 py-3 text-sm"
    >
      {{ successMessage }}
    </p>

    <div
      v-if="subscription && !loading"
      class="rounded-lg border border-border bg-surface p-4 shadow-card"
    >
      <p class="text-sm text-text-muted">
        Текущий план
      </p>
      <p class="mt-1 text-lg font-medium capitalize">
        {{ subscription.planId }}
      </p>
      <p
        v-if="subscription.expiresAt"
        class="mt-1 text-sm text-text-muted"
      >
        до {{ expiresLabel(subscription.expiresAt) }}
        <span v-if="subscription.autoRenew"> · автопродление</span>
      </p>
      <p class="mt-2 text-sm">
        Баланс:
        <RouterLink
          to="/wallet"
          class="font-medium text-primary hover:underline"
        >
          {{ formatMoney(balance) }}
        </RouterLink>
      </p>
    </div>

    <div
      v-if="!loading && !error"
      class="flex flex-wrap items-center gap-2"
    >
      <span class="text-sm text-text-muted">Период оплаты:</span>
      <UiButton
        size="sm"
        type="button"
        :intent="billingPeriod === 'monthly' ? 'primary' : 'secondary'"
        @click="billingPeriod = 'monthly'"
      >
        Помесячно
      </UiButton>
      <UiButton
        size="sm"
        type="button"
        :intent="billingPeriod === 'yearly' ? 'primary' : 'secondary'"
        @click="billingPeriod = 'yearly'"
      >
        За год
      </UiButton>
    </div>

    <ul
      v-if="!loading && !error"
      class="grid items-start gap-4 lg:grid-cols-3"
    >
      <li
        v-for="plan in plans"
        :key="plan.id"
        class="relative flex flex-col rounded-xl border border-border bg-surface p-5 shadow-card"
        :class="subscription?.planId === plan.id ? 'ring-2 ring-primary' : ''"
      >
        <span
          v-if="getPlanDetails(plan.id)?.badge"
          class="absolute -top-3 left-4 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-white"
        >
          {{ getPlanDetails(plan.id)?.badge }}
        </span>

        <div class="mb-4">
          <h2 class="text-xl font-semibold">
            {{ plan.title }}
          </h2>
          <p class="mt-1 text-sm text-text-muted">
            {{ getPlanDetails(plan.id)?.tagline ?? plan.description }}
          </p>
        </div>

        <div class="mb-4 border-b border-border pb-4">
          <p class="text-3xl font-semibold tabular-nums">
            {{ formatPlanPrice(plan, billingPeriod) }}
          </p>
          <p
            v-if="billingPeriod === 'yearly' && yearlySavings(plan)"
            class="mt-1 text-sm text-primary"
          >
            Экономия {{ formatMoney(yearlySavings(plan)!) }} в год
          </p>
          <p
            v-else-if="billingPeriod === 'monthly' && plan.yearlyPrice > 0"
            class="mt-1 text-sm text-text-muted"
          >
            или {{ formatPlanPrice(plan, 'yearly') }}
          </p>
        </div>

        <ul
          v-if="getPlanDetails(plan.id)?.highlights.length"
          class="mb-4 space-y-2"
        >
          <li
            v-for="(item, index) in getPlanDetails(plan.id)!.highlights"
            :key="index"
            class="flex items-start gap-2 text-sm"
          >
            <span
              class="mt-0.5 text-primary"
              aria-hidden="true"
            >✓</span>
            <span>{{ item }}</span>
          </li>
        </ul>

        <div class="flex-1 space-y-4">
          <div
            v-for="section in getPlanDetails(plan.id)?.sections ?? []"
            :key="section.title"
          >
            <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              {{ section.title }}
            </h3>
            <ul class="space-y-1.5">
              <li
                v-for="(feature, index) in section.features"
                :key="index"
                class="flex items-start gap-2 text-sm"
                :class="feature.included ? 'text-text' : 'text-text-muted'"
              >
                <span
                  class="mt-0.5 shrink-0"
                  aria-hidden="true"
                >
                  {{ feature.included ? '✓' : '—' }}
                </span>
                <span :class="!feature.included ? 'line-through opacity-70' : ''">
                  {{ feature.text }}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <UiButton
          class="mt-6 w-full"
          type="button"
          :intent="subscription?.planId === plan.id ? 'secondary' : 'primary'"
          :disabled="subscription?.planId === plan.id"
          @click="openActivate(plan)"
        >
          {{
            subscription?.planId === plan.id
              ? 'Текущий план'
              : plan.id === 'free'
                ? 'Перейти на Free'
                : `Выбрать ${plan.title}`
          }}
        </UiButton>
      </li>
    </ul>

    <p
      v-if="!loading && !error"
      class="text-center text-xs text-text-muted"
    >
      Лимиты соответствуют
      <a
        href="https://andrewb76.github.io/tavrida/05-microservices/PLATFORM-REGISTRY.html"
        target="_blank"
        rel="noopener noreferrer"
        class="text-primary hover:underline"
      >
        реестру платформы
      </a>
      · часть Pro-функций включается по мере реализации сервисов.
    </p>

    <UiModal
      v-model:open="activateOpen"
      :title="selectedPlan ? `Активировать ${selectedPlan.title}` : 'Активация'"
      description="Списание с кошелька"
    >
      <div
        v-if="selectedPlan"
        class="space-y-4"
      >
        <div
          v-if="selectedPlan.monthlyPrice > 0"
          class="flex gap-2"
        >
          <UiButton
            type="button"
            :intent="activateBillingPeriod === 'monthly' ? 'primary' : 'secondary'"
            @click="activateBillingPeriod = 'monthly'"
          >
            Месяц
          </UiButton>
          <UiButton
            type="button"
            :intent="activateBillingPeriod === 'yearly' ? 'primary' : 'secondary'"
            @click="activateBillingPeriod = 'yearly'"
          >
            Год
          </UiButton>
        </div>

        <p class="text-lg font-medium tabular-nums">
          {{ formatPlanPrice(selectedPlan, activateBillingPeriod) }}
        </p>

        <p
          v-if="selectedPrice > 0"
          class="text-sm text-text-muted"
        >
          Баланс: {{ formatMoney(balance) }} → после списания
          <span :class="balanceAfter < 0 ? 'text-danger font-medium' : ''">
            {{ formatMoney(balanceAfter) }}
          </span>
        </p>

        <label
          v-if="selectedPlan.id !== 'free'"
          class="flex items-center gap-2 text-sm"
        >
          <input
            v-model="autoRenew"
            type="checkbox"
            class="size-4"
          >
          Автопродление
        </label>

        <p
          v-if="activateError"
          class="text-sm text-danger"
        >
          {{ activateError }}
        </p>

        <p
          v-if="balanceAfter < 0"
          class="text-sm text-danger"
        >
          Недостаточно средств.
          <RouterLink
            to="/wallet"
            class="text-primary underline"
            @click="activateOpen = false"
          >
            Пополнить кошелёк
          </RouterLink>
        </p>

        <UiButton
          intent="primary"
          type="button"
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
