<script setup lang="ts">
import {
  createEventSubscription,
  deleteEventSubscription,
  findSubscription,
  listEventSubscriptions,
  type EventSubscription,
  type SourceDomain,
  type TargetType,
} from '@/services/subscriptions';
import { useSessionStore } from '@/stores/session';
import { UiButton, UiIcon } from '@tavrida/ui';
import { computed, onMounted, ref, watch } from 'vue';

const props = defineProps<{
  sourceDomain: SourceDomain;
  targetType: TargetType;
  targetId: string;
  /** Icon-only control (e.g. tag chip). */
  compact?: boolean;
}>();

const session = useSessionStore();
const rows = ref<EventSubscription[]>([]);
const loading = ref(false);
const busy = ref(false);
const error = ref<string | null>(null);

const current = computed(() =>
  findSubscription(rows.value, props.targetType, props.targetId),
);

const subscribed = computed(() => Boolean(current.value));

async function refresh() {
  if (!session.isMember) {
    rows.value = [];
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    rows.value = await listEventSubscriptions(props.sourceDomain);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка подписки';
  } finally {
    loading.value = false;
  }
}

async function toggle() {
  if (!session.isMember || busy.value) return;
  busy.value = true;
  error.value = null;
  try {
    if (current.value) {
      await deleteEventSubscription(current.value.id);
      rows.value = rows.value.filter((row) => row.id !== current.value!.id);
    } else {
      const created = await createEventSubscription({
        sourceDomain: props.sourceDomain,
        targetType: props.targetType,
        targetId: props.targetId,
      });
      rows.value = [created, ...rows.value];
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось изменить подписку';
  } finally {
    busy.value = false;
  }
}

onMounted(refresh);
watch(
  () => [props.targetId, props.targetType, props.sourceDomain, session.isMember] as const,
  () => {
    void refresh();
  },
);
</script>

<template>
  <div
    v-if="session.isMember"
    class="event-subscribe"
    :class="{ 'event-subscribe--compact': compact }"
  >
    <UiButton
      v-if="compact"
      intent="ghost"
      size="icon"
      type="button"
      :disabled="loading || busy"
      :aria-label="subscribed ? 'Отписаться от тега' : 'Подписаться на тег'"
      :title="subscribed ? 'Отписаться' : 'Подписаться'"
      :aria-pressed="subscribed"
      @click="toggle"
    >
      <UiIcon
        name="notifications"
        :size="14"
      />
    </UiButton>
    <UiButton
      v-else
      intent="secondary"
      size="sm"
      type="button"
      :disabled="loading || busy"
      @click="toggle"
    >
      {{ subscribed ? 'Отписаться' : 'Подписаться' }}
    </UiButton>
    <p
      v-if="error && !compact"
      class="event-subscribe__error"
    >
      {{ error }}
    </p>
  </div>
</template>

<style scoped>
.event-subscribe {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.event-subscribe--compact {
  align-items: center;
}

.event-subscribe--compact :deep(button) {
  height: 1.5rem;
  width: 1.5rem;
  color: inherit;
  opacity: 0.55;
}

.event-subscribe--compact :deep(button[aria-pressed='true']) {
  opacity: 1;
  color: var(--color-primary, #2563eb);
}

.event-subscribe__error {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-danger, #b91c1c);
  max-width: 16rem;
  text-align: right;
}
</style>
