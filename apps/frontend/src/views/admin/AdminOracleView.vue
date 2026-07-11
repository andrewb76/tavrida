<script setup lang="ts">
import { computed } from 'vue';
import OracleRangeField from '@/components/oracle/OracleRangeField.vue';
import OracleResultsPanel from '@/components/oracle/OracleResultsPanel.vue';
import { useOracleForecast } from '@/composables/useOracleForecast';
import { formatRub } from '@/utils/oracleDefaults';
import { costLabelRu, oneTimeLabelRu } from '@/utils/oracleLabels';
import {
  REFERRAL_MODEL_FIELDS,
  readReferralModelSpec,
  referralModelLabel,
  type ReferralModelId,
} from '@/utils/oracleReferralModels';

const {
  loading,
  simulating,
  error,
  config,
  form,
  result,
  compareMode,
  activeTab,
  costItemKeys,
  oneTimeKeys,
  totalBurn,
  lastMonth,
  chartMaxNet,
  readRangeSpec,
  referralModelOptions,
  enabledReferralModels,
} = useOracleForecast();

const tabs = [
  { id: 'overview' as const, label: 'Обзор' },
  { id: 'inflow' as const, label: 'Приток' },
  { id: 'activity' as const, label: 'Активность' },
  { id: 'prices' as const, label: 'Цены' },
  { id: 'referral' as const, label: 'Реферал' },
  { id: 'costs' as const, label: 'Затраты' },
];

const editingModelFields = computed(
  () => REFERRAL_MODEL_FIELDS[form.value.referralEditModelId] ?? [],
);

function costLabel(key: string): string {
  const items = (config.value.costs as { items?: Record<string, { label?: string }> })?.items;
  return costLabelRu(key, items?.[key]?.label);
}

function oneTimeLabel(key: string): string {
  return oneTimeLabelRu(key);
}

function isModelEnabled(modelId: ReferralModelId): boolean {
  return form.value.referralModels[modelId]?.enabled ?? false;
}

function toggleModelEnabled(modelId: ReferralModelId, enabled: boolean) {
  if (form.value.referralModels[modelId]) {
    form.value.referralModels[modelId].enabled = enabled;
  }
}
</script>

<template>
  <section class="space-y-6">
    <div>
      <h2 class="text-lg font-semibold">Oracle — прогноз дохода</h2>
      <p class="text-sm text-text-muted">
        Симулятор для founder/admin. Формулы на BFF (<code class="text-xs">monetization-engine</code>), без записи в
        production.
      </p>
    </div>

    <p v-if="loading" class="text-sm text-text-muted">Загрузка defaults…</p>
    <p v-else-if="error" class="text-sm text-error">{{ error }}</p>

    <template v-if="!loading">
      <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] 2xl:grid-cols-[minmax(0,1fr)_22rem]">
        <OracleResultsPanel
          class="order-first xl:order-2"
          :result="result"
          :last-month="lastMonth"
          :chart-max-net="chartMaxNet"
          :simulating="simulating"
        />

        <div class="order-2 min-w-0 space-y-4 xl:order-1">
          <nav class="flex flex-wrap gap-2 border-b border-border pb-3" aria-label="Вкладки Oracle">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              type="button"
              class="rounded-md px-3 py-1.5 text-sm transition-colors"
              :class="
                activeTab === tab.id
                  ? 'bg-primary/10 font-medium text-primary'
                  : 'text-text-muted hover:bg-bg hover:text-text'
              "
              @click="activeTab = tab.id"
            >
              {{ tab.label }}
            </button>
          </nav>

          <!-- Overview -->
          <div v-show="activeTab === 'overview'" class="grid max-w-2xl gap-4 sm:grid-cols-2">
            <OracleRangeField
              v-model="form.periodMonths"
              label="Период (мес.)"
              :spec="readRangeSpec(config.period, 'defaultMonths')"
            />
            <label class="block text-sm">
              <span class="text-text-muted">Пресет сценария</span>
              <select
                v-model="form.preset"
                class="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2"
              >
                <option value="base">Базовый</option>
                <option value="optimistic">Оптимистичный</option>
                <option value="pessimistic">Пессимистичный</option>
              </select>
            </label>
            <label class="flex items-center gap-2 self-end text-sm sm:col-span-2">
              <input v-model="compareMode" type="checkbox" class="size-4 rounded border-border" />
              Сравнить 3 сценария на графике
            </label>
          </div>

          <!-- Inflow -->
          <div v-show="activeTab === 'inflow'" class="grid max-w-lg gap-4">
            <label class="block text-sm">
              <span class="text-text-muted">Модель роста</span>
              <select v-model="form.growthModel" class="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2">
                <option value="linear">Линейная</option>
                <option value="exponential">Экспонента</option>
                <option value="logistic_s_curve">S-кривая</option>
              </select>
            </label>

            <OracleRangeField
              v-if="form.growthModel === 'linear'"
              v-model="form.registrationsPerMonth"
              label="Регистраций / мес."
              :spec="readRangeSpec((config.growth as Record<string, unknown>)?.linear, 'registrationsPerMonth')"
            />
            <template v-else-if="form.growthModel === 'exponential'">
              <OracleRangeField
                v-model="form.registrationsMonth1"
                label="Регистраций в 1-й месяц"
                :spec="readRangeSpec((config.growth as Record<string, unknown>)?.exponential, 'registrationsMonth1')"
              />
              <OracleRangeField
                v-model="form.monthlyGrowthRatePercent"
                label="Рост % / мес."
                :spec="
                  readRangeSpec((config.growth as Record<string, unknown>)?.exponential, 'monthlyGrowthRatePercent')
                "
              />
            </template>
            <template v-else>
              <OracleRangeField
                v-model="form.carryingCapacity"
                label="Ёмкость рынка"
                :spec="readRangeSpec((config.growth as Record<string, unknown>)?.logistic_s_curve, 'carryingCapacity')"
              />
              <OracleRangeField
                v-model="form.inflectionMonth"
                label="Месяц перегиба"
                :spec="readRangeSpec((config.growth as Record<string, unknown>)?.logistic_s_curve, 'inflectionMonth')"
              />
              <OracleRangeField
                v-model="form.steepness"
                label="Крутизна"
                :spec="readRangeSpec((config.growth as Record<string, unknown>)?.logistic_s_curve, 'steepness')"
              />
            </template>

            <OracleRangeField
              v-model="form.planMix.free"
              label="Доля Free, %"
              :spec="readRangeSpec((config.cohort as Record<string, unknown>)?.planMix, 'free')"
            />
            <OracleRangeField
              v-model="form.planMix.basic"
              label="Доля Basic, %"
              :spec="readRangeSpec((config.cohort as Record<string, unknown>)?.planMix, 'basic')"
            />
            <OracleRangeField
              v-model="form.planMix.pro"
              label="Доля Pro, %"
              :spec="readRangeSpec((config.cohort as Record<string, unknown>)?.planMix, 'pro')"
            />
            <OracleRangeField
              v-model="form.churnPercent"
              label="Отток, % / мес."
              :spec="readRangeSpec(config.cohort, 'monthlyChurnRatePercent')"
            />
            <OracleRangeField
              v-model="form.yearlyBillingSharePercent"
              label="Доля годовой оплаты %"
              :spec="readRangeSpec(config.cohort, 'yearlyBillingSharePercent')"
            />
          </div>

          <!-- Activity -->
          <div v-show="activeTab === 'activity'" class="grid max-w-lg gap-4">
            <OracleRangeField
              v-model="form.auctionsPerUserPerMonth"
              label="Лотов на платящего / мес."
              :spec="{ min: 0, max: 20, default: 1, step: 0.1 }"
            />
            <OracleRangeField
              v-model="form.promotionAttachRatePercent"
              label="Доля лотов с продвижением, %"
              :spec="readRangeSpec(config.activity, 'auctionPromotionAttachRatePercent')"
            />
            <OracleRangeField
              v-model="form.reserveAttachRatePercent"
              label="Доля с резервной ценой, %"
              :spec="readRangeSpec(config.activity, 'auctionReserveAttachRatePercent')"
            />
            <OracleRangeField
              v-model="form.customPresetAttachRatePercent"
              label="Доля со своим сроком, %"
              :spec="readRangeSpec(config.activity, 'auctionCustomPresetAttachRatePercent')"
            />
          </div>

          <!-- Prices -->
          <div v-show="activeTab === 'prices'" class="grid max-w-lg gap-4">
            <h3 class="text-sm font-medium">Подписки</h3>
            <OracleRangeField
              v-model="form.basicMonthly"
              label="Базовый, ₽/мес"
              :spec="readRangeSpec((config.subscriptions as Record<string, unknown>)?.basic, 'monthlyPrice')"
            />
            <OracleRangeField
              v-model="form.basicYearly"
              label="Базовый, ₽/год"
              :spec="readRangeSpec((config.subscriptions as Record<string, unknown>)?.basic, 'yearlyPrice')"
            />
            <OracleRangeField
              v-model="form.proMonthly"
              label="Про, ₽/мес"
              :spec="readRangeSpec((config.subscriptions as Record<string, unknown>)?.pro, 'monthlyPrice')"
            />
            <OracleRangeField
              v-model="form.proYearly"
              label="Про, ₽/год"
              :spec="readRangeSpec((config.subscriptions as Record<string, unknown>)?.pro, 'yearlyPrice')"
            />

            <h3 class="pt-2 text-sm font-medium">Разовые списания</h3>
            <label
              v-for="key in oneTimeKeys"
              :key="key"
              class="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm"
            >
              <span class="flex items-center gap-2">
                <input v-model="form.oneTimePrices[key].enabled" type="checkbox" class="size-4 rounded border-border" />
                <span>{{ oneTimeLabel(key) }}</span>
              </span>
              <input
                v-model.number="form.oneTimePrices[key].amountRub"
                type="number"
                min="0"
                class="w-24 rounded-md border border-border bg-bg px-2 py-1 text-right font-mono text-xs"
              />
            </label>
          </div>

          <!-- Referral -->
          <div v-show="activeTab === 'referral'" class="grid max-w-lg gap-4">
            <label class="flex items-center gap-2 text-sm">
              <input v-model="form.referralProgramEnabled" type="checkbox" class="size-4 rounded border-border" />
              Программа реферала включена
            </label>

            <OracleRangeField
              v-model="form.referralAttachRatePercent"
              label="Доля платящих по рефералу, %"
              :spec="readRangeSpec(config.referral, 'attachRatePercent')"
            />

            <div class="space-y-2 rounded-lg border border-border p-3">
              <p class="text-sm font-medium">Активные модели (комбо)</p>
              <label
                v-for="opt in referralModelOptions"
                :key="opt.id"
                class="flex items-center gap-2 text-sm"
                :class="!form.referralProgramEnabled ? 'opacity-50' : ''"
              >
                <input
                  type="checkbox"
                  class="size-4 rounded border-border"
                  :checked="isModelEnabled(opt.id)"
                  :disabled="!form.referralProgramEnabled"
                  @change="toggleModelEnabled(opt.id, ($event.target as HTMLInputElement).checked)"
                />
                {{ opt.label }}
              </label>
              <p v-if="form.referralProgramEnabled && enabledReferralModels.length === 0" class="text-xs text-text-muted">
                Включите хотя бы одну модель для расчёта выплат.
              </p>
            </div>

            <label class="block text-sm">
              <span class="text-text-muted">Модель для настройки</span>
              <select
                v-model="form.referralEditModelId"
                class="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2"
                :disabled="!form.referralProgramEnabled"
              >
                <option v-for="opt in referralModelOptions" :key="opt.id" :value="opt.id">
                  {{ opt.label }}
                </option>
              </select>
            </label>

            <label class="flex items-center gap-2 text-sm">
              <input
                v-model="form.referralModels[form.referralEditModelId].enabled"
                type="checkbox"
                class="size-4 rounded border-border"
                :disabled="!form.referralProgramEnabled"
              />
              Модель «{{ referralModelLabel(form.referralEditModelId) }}» включена
            </label>

            <template v-if="form.referralProgramEnabled && form.referralModels[form.referralEditModelId]?.enabled">
              <OracleRangeField
                v-for="field in editingModelFields"
                :key="field.key"
                v-model="form.referralModels[form.referralEditModelId].params[field.key]"
                :label="field.label"
                :spec="readReferralModelSpec(config, form.referralEditModelId, field.key)"
              />
            </template>
          </div>

          <!-- Costs -->
          <div v-show="activeTab === 'costs'" class="grid max-w-lg gap-4">
            <OracleRangeField
              v-for="key in costItemKeys"
              :key="key"
              v-model="form.costItems[key]"
              :label="costLabel(key)"
              :spec="readRangeSpec((config.costs as Record<string, unknown>)?.items, key)"
            />

            <div class="rounded-lg border border-border bg-bg/50 p-3 text-sm">
              <p class="text-text-muted">Сумма статей затрат</p>
              <p class="font-semibold">{{ formatRub(totalBurn) }} / мес.</p>
            </div>

            <label class="flex items-center gap-2 text-sm">
              <input v-model="form.manualBurnOnly" type="checkbox" class="size-4 rounded border-border" />
              Ручной режим расходов (только окупаемость)
            </label>
            <OracleRangeField
              v-model="form.manualTotalBurn"
              label="Общие расходы, ₽/мес"
              :spec="readRangeSpec(config.costs, 'totalMonthlyBurn')"
              hint="При ручном режиме статьи затрат не меняются — пересчитывается только месяц окупаемости."
            />

            <h3 class="pt-2 text-sm font-medium">Пополнения (комиссия)</h3>
            <OracleRangeField
              v-model="form.avgDepositRub"
              label="Средний депозит ₽"
              :spec="readRangeSpec(config.deposits, 'avgAmountRub')"
            />
            <OracleRangeField
              v-model="form.depositsPerUser"
              label="Депозитов на пользователя / мес"
              :spec="readRangeSpec(config.deposits, 'eventsPerPayingUserPerMonth')"
            />
            <OracleRangeField
              v-model="form.shareDepositingPercent"
              label="Доля пополняющих %"
              :spec="readRangeSpec(config.deposits, 'shareOfUsersDepositingPercent')"
            />
          </div>
        </div>
      </div>
    </template>
  </section>
</template>
