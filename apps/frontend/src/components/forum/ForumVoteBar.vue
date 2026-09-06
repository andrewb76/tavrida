<script setup lang="ts">
import { castForumVote, clearForumVote } from '@/services/forum';
import { UiIcon } from '@tavrida/ui';
import { computed, ref, watch } from 'vue';
import { toast } from 'vue-sonner';

type ForumVoteSign = 1 | -1 | null;

const props = defineProps<{
  contentId: string;
  contentType: 'topic' | 'comment';
  plusCount: number;
  minusCount: number;
  myVote: ForumVoteSign;
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
      myVote: ForumVoteSign;
      canChange: boolean;
    },
  ];
}>();

const plusCount = ref(props.plusCount);
const minusCount = ref(props.minusCount);
const myVote = ref<1 | -1 | null>(props.myVote);
const canChange = ref(props.canChange);
const busy = ref(false);
const reasonOpen = ref(false);
const reasonText = ref('');

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

function toggleReason() {
  reasonOpen.value = !reasonOpen.value;
  if (!reasonOpen.value) reasonText.value = '';
}

async function onPlus() {
  if (props.disabled || busy.value) return;
  if (myVote.value === 1) {
    if (!canChange.value) return;
    await clear();
    return;
  }
  if (reasonOpen.value && reasonText.value.trim()) {
    await cast(1, reasonText.value.trim());
    reasonOpen.value = false;
    reasonText.value = '';
  } else {
    await cast(1);
  }
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

async function cast(value: 1 | -1, reason?: string) {
  busy.value = true;
  try {
    const result = await castForumVote({
      contentId: props.contentId,
      contentType: props.contentType,
      value,
      reason,
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
  <div class="forum-vote-wrap">
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
        <UiIcon
          name="thumbsUp"
          :size="16"
        />
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
        <UiIcon
          name="thumbsDown"
          :size="16"
        />
      </button>
      <button
        v-if="!disabled && myVote !== 1"
        type="button"
        class="forum-vote__reason-toggle"
        :class="{ 'is-active': reasonOpen }"
        title="Добавить причину"
        @click="toggleReason"
      >
        ✎
      </button>
    </div>
    <div
      v-if="reasonOpen"
      class="forum-vote-reason"
    >
      <input
        v-model="reasonText"
        type="text"
        class="forum-vote-reason__input"
        placeholder="Спасибо за…"
        maxlength="512"
        @keydown.enter.prevent="onPlus"
      >
    </div>
  </div>
</template>

<style scoped>
.forum-vote-wrap {
  display: inline-flex;
  flex-direction: column;
  gap: 0.35rem;
}

.forum-vote {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.forum-vote__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  height: 2rem;
  border: 1px solid var(--color-border);
  border-radius: 0.375rem;
  background: transparent;
  color: inherit;
  line-height: 1;
  cursor: pointer;
}

.forum-vote__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.forum-vote__btn.is-active {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 18%, transparent);
  color: var(--color-primary);
}

.forum-vote__score {
  min-width: 1.5rem;
  text-align: center;
  font-variant-numeric: tabular-nums;
  font-size: 0.875rem;
}

.forum-vote__reason-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border: none;
  border-radius: 0.25rem;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 0.75rem;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;
}

.forum-vote:hover .forum-vote__reason-toggle,
.forum-vote__reason-toggle.is-active {
  opacity: 1;
}

.forum-vote__reason-toggle:hover {
  background: var(--color-bg-muted);
  color: var(--color-text);
}

.forum-vote-reason {
  display: flex;
}

.forum-vote-reason__input {
  width: 100%;
  max-width: 18rem;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 0.375rem;
  background: var(--color-bg);
  color: var(--color-text);
  font: inherit;
  font-size: 0.8125rem;
  line-height: 1.4;
}

.forum-vote-reason__input::placeholder {
  color: var(--color-text-muted);
}

.forum-vote-reason__input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 20%, transparent);
}
</style>
