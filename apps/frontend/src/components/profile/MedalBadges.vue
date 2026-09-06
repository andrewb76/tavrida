<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { listUserMedals, type ForumUserMedal } from '@/services/forum';

const props = defineProps<{
  userId: string;
  limit?: number;
}>();

const medals = ref<ForumUserMedal[]>([]);
const loading = ref(false);

const displayed = computed(() =>
  props.limit ? medals.value.slice(0, props.limit) : medals.value,
);

const remaining = computed(() =>
  props.limit && medals.value.length > props.limit
    ? medals.value.length - props.limit
    : 0,
);

async function load() {
  if (!props.userId) return;
  loading.value = true;
  try {
    medals.value = await listUserMedals(props.userId);
  } catch {
    medals.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(load);
watch(() => props.userId, load);
</script>

<template>
  <div
    v-if="loading || medals.length > 0"
    class="medal-badges"
  >
    <template v-if="loading">
      <span class="medal-badges__skeleton" />
      <span class="medal-badges__skeleton" />
    </template>
    <template v-else>
      <span
        v-for="m in displayed"
        :key="m.medalId"
        class="medal-badges__item"
        :title="m.reason ? `${m.medalName} — ${m.reason}` : m.medalName"
      >
        <img
          v-if="m.medalIconUrl"
          :src="m.medalIconUrl"
          :alt="m.medalName"
          class="medal-badges__icon"
        >
        <span
          v-else
          class="medal-badges__emoji"
        >🏅</span>
        <span class="medal-badges__name">{{ m.medalName }}</span>
      </span>
      <span
        v-if="remaining > 0"
        class="medal-badges__more"
      >
        +{{ remaining }}
      </span>
    </template>
  </div>
</template>

<style scoped>
.medal-badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
}

.medal-badges__item {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.15rem 0.45rem;
  border-radius: 0.375rem;
  background: var(--color-primary-soft, rgba(59, 130, 246, 0.08));
  color: var(--color-primary);
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
  cursor: default;
}

.medal-badges__icon {
  width: 1rem;
  height: 1rem;
  border-radius: 0.125rem;
  object-fit: contain;
}

.medal-badges__emoji {
  font-size: 0.8rem;
  line-height: 1;
}

.medal-badges__name {
  max-width: 7rem;
  overflow: hidden;
  text-overflow: ellipsis;
}

.medal-badges__more {
  font-size: 0.7rem;
  color: var(--color-text-muted);
}

.medal-badges__skeleton {
  display: inline-block;
  width: 4rem;
  height: 1.25rem;
  border-radius: 0.375rem;
  background: var(--color-border);
  animation: medal-pulse 1.2s ease-in-out infinite;
}

@keyframes medal-pulse {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 0.8;
  }
}
</style>
