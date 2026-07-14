<script setup lang="ts">
import { UiModal } from '@tavrida/ui';
import { computed, ref, watch } from 'vue';
import { toast } from 'vue-sonner';
import {
  fetchReputationLog,
  formatKarma,
  formatRating,
  reputationSourceLabel,
  type ReputationLogEntry,
} from '@/services/profile';

const props = defineProps<{
  userId: string;
  metric: 'karma' | 'rating';
  verifiedSales?: number;
}>();

const open = defineModel<boolean>('open', { required: true });

const loading = ref(false);
const entries = ref<ReputationLogEntry[]>([]);

const title = computed(() =>
  props.metric === 'karma' ? 'История кармы' : 'История рейтинга',
);

watch(open, (isOpen) => {
  if (isOpen) void load();
});

async function load() {
  loading.value = true;
  try {
    entries.value = await fetchReputationLog(props.userId, props.metric);
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Не удалось загрузить лог');
    entries.value = [];
  } finally {
    loading.value = false;
  }
}

function formatDelta(delta: number): string {
  if (props.metric === 'karma') return formatKarma(delta);
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)}`;
}

function formatBalance(balance: number): string {
  if (props.metric === 'karma') return formatKarma(balance);
  return formatRating(balance, props.verifiedSales && props.verifiedSales > 0 ? props.verifiedSales : 1);
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
</script>

<template>
  <UiModal
    v-model:open="open"
    :title="title"
  >
    <p
      v-if="loading"
      class="rep-log__muted"
    >
      Загрузка…
    </p>
    <p
      v-else-if="entries.length === 0"
      class="rep-log__muted"
    >
      Пока нет записей.
    </p>
    <ul
      v-else
      class="rep-log"
    >
      <li
        v-for="row in entries"
        :key="row.id"
        class="rep-log__item"
      >
        <div class="rep-log__row">
          <span
            class="rep-log__delta"
            :class="row.delta >= 0 ? 'is-plus' : 'is-minus'"
          >{{ formatDelta(row.delta) }}</span>
          <span class="rep-log__after">→ {{ formatBalance(row.balanceAfter) }}</span>
          <span class="rep-log__when">{{ formatWhen(row.createdAt) }}</span>
        </div>
        <div class="rep-log__meta">
          {{ reputationSourceLabel(row.source) }}
          <template v-if="row.note">
            · {{ row.note }}
          </template>
        </div>
      </li>
    </ul>
  </UiModal>
</template>

<style scoped>
.rep-log {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.75rem;
  max-height: min(60vh, 28rem);
  overflow: auto;
}

.rep-log__item {
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--color-border, #e5e5e5);
}

.rep-log__item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.rep-log__row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem 0.75rem;
}

.rep-log__delta {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.rep-log__delta.is-plus {
  color: #067647;
}

.rep-log__delta.is-minus {
  color: #b42318;
}

.rep-log__after {
  font-size: 0.875rem;
  color: var(--color-text, #111);
}

.rep-log__when {
  margin-left: auto;
  font-size: 0.75rem;
  color: var(--color-text-muted, #666);
}

.rep-log__meta {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: var(--color-text-muted, #666);
}

.rep-log__muted {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-muted, #666);
}
</style>
