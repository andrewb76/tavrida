<script setup lang="ts">
const props = defineProps<{
  type: string;
}>();

const icons: Record<string, string> = {
  int: '📊',
  boolean: '✓',
  string: '📝',
  enum: '📋',
};
</script>

<template>
  <span class="text-sm" :title="props.type">{{ icons[props.type] ?? '❓' }}</span>
</template>
