<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  count: number;
  label?: string;
}>();

const expanded = ref(false);
</script>

<template>
  <button
    v-if="count > 0"
    type="button"
    class="attachment-badge"
    @click="expanded = !expanded"
  >
    <span aria-hidden="true">📎</span>
    <span>{{ count }}</span>
    <span class="attachment-badge__label">{{ expanded ? 'Скрыть' : (label ?? 'Вложения') }}</span>
  </button>
  <slot
    v-if="expanded"
    name="list"
  />
</template>

<style scoped>
.attachment-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid var(--color-border, #ddd);
  border-radius: 999px;
  padding: 0.2rem 0.65rem;
  background: var(--color-surface, #fff);
  cursor: pointer;
  font-size: 0.9rem;
}

.attachment-badge__label {
  color: var(--color-text-muted, #666);
}
</style>
