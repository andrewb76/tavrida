<script setup lang="ts">
import { castForumVote, clearForumVote } from '@/services/forum';
import { computed, ref, watch } from 'vue';
import { toast } from 'vue-sonner';

const props = defineProps<{
  contentId: string;
  contentType: 'topic' | 'comment';
  plusCount: number;
  minusCount: number;
  myVote: 1 | -1 | null;
  canChange: boolean;
  /** Hide controls when viewing own content */
  disabled?: boolean;
}>();

const emit = defineEmits<{
  updated: [
    {
      plusCount: number;
      minusCount: number;
      score: number;
      myVote: 1 | -1 | null;
      canChange: boolean;
    },
  ];
}>();

const plusCount = ref(props.plusCount);
const minusCount = ref(props.minusCount);
const myVote = ref<1 | -1 | null>(props.myVote);
const canChange = ref(props.canChange);
const busy = ref(false);

watch(
  () => [props.plusCount, props.minusCount, props.myVote, props.canChange] as const,
  ([p, m, v, c]) => {
    plusCount.value = p;
    minusCount.value = m;
    myVote.value = v;
    canChange.value = c;
  },
);

const score = computed(() => plusCount.value - minusCount.value);

async function onPlus() {
  if (props.disabled || busy.value) return;
  if (myVote.value === 1) {
    if (!canChange.value) return;
    await clear();
    return;
  }
  await cast(1);
}

async function onMinus() {
  if (props.disabled || busy.value) return;
  if (myVote.value === -1) {
    if (!canChange.value) return;
    await clear();
    return;
  }
  await cast(-1);
}

async function cast(value: 1 | -1) {
  busy.value = true;
  try {
    const result = await castForumVote({
      contentId: props.contentId,
      contentType: props.contentType,
      value,
    });
    apply(result);
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка голоса');
  } finally {
    busy.value = false;
  }
}

async function clear() {
  busy.value = true;
  try {
    const result = await clearForumVote({
      contentId: props.contentId,
      contentType: props.contentType,
    });
    apply(result);
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Ошибка голоса');
  } finally {
    busy.value = false;
  }
}

function apply(result: {
  plusCount: number;
  minusCount: number;
  score: number;
  myVote: 1 | -1 | null;
  canChange: boolean;
}) {
  plusCount.value = result.plusCount;
  minusCount.value = result.minusCount;
  myVote.value = result.myVote;
  canChange.value = result.canChange;
  emit('updated', result);
}
</script>

<template>
  <div
    class="forum-vote"
    role="group"
    aria-label="Оценка"
  >
    <button
      type="button"
      class="forum-vote__btn"
      :class="{ 'is-active': myVote === 1 }"
      :disabled="disabled || busy || (myVote != null && myVote !== 1 && !canChange)"
      :aria-pressed="myVote === 1"
      title="Плюс"
      @click="onPlus"
    >
      +
    </button>
    <span
      class="forum-vote__score"
      :title="`+${plusCount} / −${minusCount}`"
    >{{ score }}</span>
    <button
      type="button"
      class="forum-vote__btn"
      :class="{ 'is-active': myVote === -1 }"
      :disabled="disabled || busy || (myVote != null && myVote !== -1 && !canChange)"
      :aria-pressed="myVote === -1"
      title="Минус"
      @click="onMinus"
    >
      −
    </button>
  </div>
</template>

<style scoped>
.forum-vote {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.forum-vote__btn {
  min-width: 2rem;
  height: 2rem;
  border: 1px solid var(--color-border, #ccc);
  border-radius: 0.375rem;
  background: transparent;
  color: inherit;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
}

.forum-vote__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.forum-vote__btn.is-active {
  border-color: var(--color-primary, #2563eb);
  background: color-mix(in srgb, var(--color-primary, #2563eb) 18%, transparent);
  font-weight: 600;
}

.forum-vote__score {
  min-width: 1.5rem;
  text-align: center;
  font-variant-numeric: tabular-nums;
  font-size: 0.875rem;
}
</style>
