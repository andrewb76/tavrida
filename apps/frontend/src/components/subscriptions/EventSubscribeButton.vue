<script setup lang="ts">
import {
  findSubscription,
  type SourceDomain,
  type TargetType,
} from '@/services/subscriptions';
import { useSessionStore } from '@/stores/session';
import { useSubscriptionsStore } from '@/stores/subscriptions';
import { UiButton, UiIcon } from '@tavrida/ui';
import { storeToRefs } from 'pinia';
import { computed, onMounted, ref, watch } from 'vue';

const props = defineProps<{
  sourceDomain: SourceDomain;
  targetType: TargetType;
  targetId: string;
  /** Icon-only control (e.g. tag chip). */
  compact?: boolean;
}>();

const session = useSessionStore();
const store = useSubscriptionsStore();
const { allRows, error: storeError } = storeToRefs(store);

const busy = ref(false);
const localError = ref<string | null>(null);

const current = computed(() =>
  findSubscription(allRows.value, props.targetType, props.targetId),
);

const subscribed = computed(() => Boolean(current.value));
const loading = computed(() => store.isLoading(props.sourceDomain));
const error = computed(() => localError.value ?? storeError.value);

async function ensure() {
  if (!session.isMember) return;
  localError.value = null;
  try {
    await store.ensureLoaded(props.sourceDomain);
  } catch (e) {
    localError.value = e instanceof Error ? e.message : 'Ошибка подписки';
  }
}

async function toggle() {
  if (!session.isMember || busy.value) return;
  busy.value = true;
  localError.value = null;
  try {
    if (current.value) {
      await store.unsubscribe(current.value.id);
    } else {
      await store.subscribe({
        sourceDomain: props.sourceDomain,
        targetType: props.targetType,
        targetId: props.targetId,
      });
    }
  } catch (e) {
    localError.value = e instanceof Error ? e.message : 'Не удалось изменить подписку';
  } finally {
    busy.value = false;
  }
}

onMounted(() => {
  void ensure();
});
watch(
  () => [props.targetId, props.targetType, props.sourceDomain, session.isMember] as const,
  ([, , , isMember]) => {
    if (!isMember) return;
    void ensure();
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
      :aria-label="subscribed ? 'Отписаться' : 'Подписаться'"
      :title="subscribed ? 'Отписаться' : 'Подписаться'"
      :aria-pressed="subscribed"
      @click="toggle"
    >
      <UiIcon
        name="notifications"
        :size="18"
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

.event-subscribe--compact :deep(button[aria-pressed='true']) {
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
