<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { fetchReputationLog, type ReputationLogEntry } from '@/services/profile';

const props = defineProps<{ userId: string }>();

const entries = ref<ReputationLogEntry[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    entries.value = await fetchReputationLog(props.userId, 'karma');
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить активность';
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function formatDelta(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value}`;
}
</script>

<template>
  <div class="profile-activity">
    <p v-if="loading" class="profile-activity__status">Загрузка…</p>
    <p v-else-if="error" class="profile-activity__status profile-activity__status--error">{{ error }}</p>
    <p v-else-if="entries.length === 0" class="profile-activity__status">Записей пока нет</p>
    <template v-else>
      <ul class="profile-activity__list">
        <li v-for="(entry, i) in entries" :key="i" class="profile-activity__item">
          <div class="profile-activity__header">
            <span class="profile-activity__actor">{{ entry.actor?.displayName ?? entry.actorId }}</span>
            <span
              class="profile-activity__delta"
              :class="{
                'profile-activity__delta--positive': entry.delta > 0,
                'profile-activity__delta--negative': entry.delta < 0,
              }"
            >{{ formatDelta(entry.delta) }}</span>
          </div>
          <p v-if="entry.reason" class="profile-activity__reason">{{ entry.reason }}</p>
          <span class="profile-activity__date">{{ new Date(entry.createdAt).toLocaleString('ru-RU') }}</span>
        </li>
      </ul>
    </template>
  </div>
</template>

<style scoped>
.profile-activity__status {
  color: var(--color-text-muted, #999);
  font-size: 0.9rem;
  text-align: center;
  padding: 2rem 0;
}

.profile-activity__status--error {
  color: var(--color-error, #ef4444);
}

.profile-activity__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.profile-activity__item {
  padding: 0.6rem 0.85rem;
  border: 1px solid var(--color-border, #333);
  border-radius: 0.5rem;
  background: var(--color-bg, #1a1a2e);
}

.profile-activity__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.profile-activity__actor {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text, #eee);
}

.profile-activity__delta {
  font-weight: 600;
  font-size: 0.85rem;
}

.profile-activity__delta--positive {
  color: var(--color-success, #22c55e);
}

.profile-activity__delta--negative {
  color: var(--color-error, #ef4444);
}

.profile-activity__reason {
  margin: 0.2rem 0 0;
  font-size: 0.8rem;
  color: var(--color-text-muted, #999);
}

.profile-activity__date {
  font-size: 0.75rem;
  color: var(--color-text-muted, #999);
}
</style>
