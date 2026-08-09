<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  modelValue: string;
  label?: string;
  required?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

// Parse "-0001-01-01" → { year: -1, month: 1, day: 1 }
// Parse "0476-01-01" → { year: 476, month: 1, day: 1 }
function parseDate(value: string): { year: number; month: number; day: number } {
  if (!value) return { year: 1, month: 1, day: 1 };
  const neg = value.startsWith('-');
  const clean = neg ? value.slice(1) : value;
  const parts = clean.split('-');
  const year = neg ? -Number(parts[0]) : Number(parts[0]);
  return {
    year,
    month: Number(parts[1]) || 1,
    day: Number(parts[2]) || 1,
  };
}

function formatDate(year: number, month: number, day: number): string {
  const y = year < 0 ? `-${String(Math.abs(year)).padStart(4, '0')}` : String(year).padStart(4, '0');
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const parsed = computed(() => parseDate(props.modelValue));

const year = computed({
  get: () => parsed.value.year,
  set: (v: number) => {
    emit('update:modelValue', formatDate(v, parsed.value.month, parsed.value.day));
  },
});

const month = computed({
  get: () => parsed.value.month,
  set: (v: number) => {
    emit('update:modelValue', formatDate(parsed.value.year, v, parsed.value.day));
  },
});

const day = computed({
  get: () => parsed.value.day,
  set: (v: number) => {
    emit('update:modelValue', formatDate(parsed.value.year, parsed.value.month, v));
  },
});

const displayYear = computed(() => {
  const y = parsed.value.year;
  if (y < 0) return `${Math.abs(y)} до н.э.`;
  if (y === 0) return '1 до н.э.'; // Year 0 doesn't exist
  return `${y} н.э.`;
});
</script>

<template>
  <div class="grid gap-1 text-sm">
    <label v-if="label" class="font-medium">{{ label }}</label>
    <div class="flex items-center gap-1">
      <input
        v-model.number="year"
        type="number"
        class="w-20 rounded border border-border bg-surface px-2 py-1 text-center font-mono text-sm"
        :required="required"
        placeholder="Год"
        aria-label="Год"
      >
      <span class="text-muted">–</span>
      <input
        v-model.number="month"
        type="number"
        min="1"
        max="12"
        class="w-14 rounded border border-border bg-surface px-2 py-1 text-center font-mono text-sm"
        :required="required"
        placeholder="ММ"
        aria-label="Месяц"
      >
      <span class="text-muted">–</span>
      <input
        v-model.number="day"
        type="number"
        min="1"
        max="31"
        class="w-14 rounded border border-border bg-surface px-2 py-1 text-center font-mono text-sm"
        :required="required"
        placeholder="ДД"
        aria-label="День"
      >
      <span class="ml-2 text-xs text-muted whitespace-nowrap">{{ displayYear }}</span>
    </div>
  </div>
</template>
