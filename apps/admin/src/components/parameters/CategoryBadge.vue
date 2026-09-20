<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  category: string;
}>();

const categoryConfig: Record<string, { label: string; color: string; icon: string }> = {
  'system-var': { label: 'system', color: 'bg-gray-100 text-gray-700', icon: '⚙' },
  'tarif-var': { label: 'tarif', color: 'bg-blue-100 text-blue-700', icon: '💳' },
  'limited-user-var': { label: 'limited', color: 'bg-orange-100 text-orange-700', icon: '🔄' },
  'user-var': { label: 'user', color: 'bg-green-100 text-green-700', icon: '👤' },
};

const config = computed(() => categoryConfig[props.category] ?? categoryConfig['system-var']);
</script>

<template>
  <span
    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
    :class="config.color"
  >
    <span>{{ config.icon }}</span>
    <span>{{ config.label }}</span>
  </span>
</template>
