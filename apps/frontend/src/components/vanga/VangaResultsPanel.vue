<script setup lang="ts">
import { formatRub } from '@/utils/vangaDefaults';
import { referralModelLabel } from '@/utils/vangaReferralModels';
import type { SimulateResult } from '@/services/vanga.types';

defineProps<{
  result: SimulateResult | null;
  lastMonth: SimulateResult['months'][number] | null;
  chartMaxNet: number;
  simulating: boolean;
}>();
</script>

<template>
  <div
    class="space-y-4 rounded-lg border border-border bg-surface p-4 shadow-sm sticky top-4 z-10"
  >
    <div class="flex items-center justify-between gap-2">
      <h3 class="text-sm font-medium">
        Результаты
      </h3>
      <span
        v-if="simulating"
        class="text-xs text-text-muted"
      >Пересчёт…</span>
    </div>

    <template v-if="result && lastMonth">
      <div class="grid gap-2 sm:grid-cols-2">
        <div class="rounded-md border border-border bg-bg/40 p-2.5">
          <p class="text-xs text-text-muted">
            Валовый доход
          </p>
          <p class="text-base font-semibold">
            {{ formatRub(lastMonth.gross) }}
          </p>
        </div>
        <div class="rounded-md border border-border bg-bg/40 p-2.5">
          <p class="text-xs text-text-muted">
            Чистый доход
          </p>
          <p
            class="text-base font-semibold"
            :class="lastMonth.net >= 0 ? 'text-emerald-600' : 'text-error'"
          >
            {{ formatRub(lastMonth.net) }}
          </p>
        </div>
        <div class="rounded-md border border-border bg-bg/40 p-2.5">
          <p class="text-xs text-text-muted">
            Выручка подписок
          </p>
          <p class="text-base font-semibold">
            {{ formatRub(lastMonth.mrr) }}
          </p>
        </div>
        <div class="rounded-md border border-border bg-bg/40 p-2.5">
          <p class="text-xs text-text-muted">
            Окупаемость
          </p>
          <p class="text-base font-semibold">
            {{ result.breakEvenMonth ? `мес. ${result.breakEvenMonth}` : '—' }}
          </p>
        </div>
      </div>

      <div
        v-if="lastMonth.referralOut > 0"
        class="rounded-md border border-border bg-bg/40 p-2.5 text-sm"
      >
        <p class="text-xs text-text-muted">
          Реферальные выплаты
        </p>
        <p class="font-semibold">
          {{ formatRub(lastMonth.referralOut) }}
        </p>
      </div>

      <div
        v-if="result.referralByModel?.length"
        class="text-sm"
      >
        <p class="mb-1 text-xs text-text-muted">
          По моделям (посл. мес.)
        </p>
        <ul class="space-y-0.5">
          <li
            v-for="row in result.referralByModel"
            :key="row.modelId"
          >
            {{ referralModelLabel(row.modelId) }}: {{ formatRub(row.payout) }}
          </li>
        </ul>
      </div>

      <div
        v-if="result.referralByDepth?.length"
        class="text-sm"
      >
        <p class="mb-1 text-xs text-text-muted">
          По уровням дерева
        </p>
        <ul class="space-y-0.5">
          <li
            v-for="row in result.referralByDepth"
            :key="row.depth"
          >
            Уровень {{ row.depth }}: {{ formatRub(row.payout) }}
          </li>
        </ul>
      </div>

      <div v-if="result.months.length">
        <p class="mb-2 text-xs text-text-muted">
          Чистый доход по месяцам
        </p>
        <div class="flex h-28 items-end gap-0.5">
          <div
            v-for="(month, idx) in result.months"
            :key="idx"
            class="min-w-1.5 flex-1 rounded-t bg-primary/70"
            :style="{ height: `${(Math.abs(month.net) / chartMaxNet) * 100}%` }"
            :title="`М${idx + 1}: ${formatRub(month.net)}`"
          />
        </div>
      </div>
    </template>

    <p
      v-else
      class="text-sm text-text-muted"
    >
      Настройте параметры — результат появится здесь.
    </p>
  </div>
</template>
