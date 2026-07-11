<script setup lang="ts">
import { computed } from 'vue';
import type { RangeSpec } from '@/services/oracle.types';

const model = defineModel<number>({ required: true });

const props = defineProps<{
  label: string;
  spec: RangeSpec;
  hint?: string;
}>();

const min = computed(() => props.spec.min ?? 0);
const max = computed(() => props.spec.max ?? 100);
const step = computed(() => props.spec.step ?? 1);
</script>

<template>
  <label class="block text-sm">
    <div class="flex items-baseline justify-between gap-2">
      <span class="text-text-muted">{{ label }}</span>
      <span class="font-mono text-xs text-text">{{ model }}</span>
    </div>
    <input
      v-model.number="model"
      type="range"
      class="mt-1 w-full accent-primary"
      :min="min"
      :max="max"
      :step="step"
    >
    <input
      v-model.number="model"
      type="number"
      class="mt-1 w-full rounded-md border border-border bg-bg px-2 py-1 text-sm"
      :min="min"
      :max="max"
      :step="step"
    >
    <p
      v-if="hint"
      class="mt-0.5 text-xs text-text-muted"
    >{{ hint }}</p>
  </label>
</template>
