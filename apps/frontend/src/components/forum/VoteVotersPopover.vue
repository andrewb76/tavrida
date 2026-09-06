<script setup lang="ts">
import UserAvatar from '@/components/user/UserAvatar.vue';
import { listVoteVoters, type ForumVoteVoter } from '@/services/forum';
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { toast } from 'vue-sonner';

const props = defineProps<{
  contentType: 'topic' | 'comment';
  contentId: string;
  plusCount: number;
  minusCount: number;
}>();

const open = ref(false);
const loading = ref(false);
const voters = ref<ForumVoteVoter[]>([]);
const tab = ref<'plus' | 'minus'>('plus');

const plusVoters = computed(() => voters.value.filter((v) => v.value === 1));
const minusVoters = computed(() => voters.value.filter((v) => v.value === -1));

const activeVoters = computed(() =>
  tab.value === 'plus' ? plusVoters.value : minusVoters.value,
);

const hasAny = computed(() => props.plusCount > 0 || props.minusCount > 0);

async function load() {
  loading.value = true;
  try {
    voters.value = await listVoteVoters(props.contentType, props.contentId);
  } catch {
    toast.error('Не удалось загрузить голосующих');
    voters.value = [];
  } finally {
    loading.value = false;
  }
}

function toggle() {
  if (!hasAny.value) return;
  open.value = !open.value;
  if (open.value && voters.value.length === 0) void load();
}

watch(
  () => [props.contentType, props.contentId],
  () => {
    open.value = false;
    voters.value = [];
  },
);

function profileTo(userId: string) {
  return { name: 'profile-user' as const, params: { userId } };
}
</script>

<template>
  <div class="vote-voters">
    <button
      type="button"
      class="vote-voters__trigger"
      :class="{ 'is-disabled': !hasAny }"
      :title="hasAny ? 'Кто проголосовал' : 'Нет голосов'"
      @click="toggle"
    >
      <slot />
    </button>
    <Teleport to="body">
      <div
        v-if="open"
        class="vote-voters__overlay"
        @click.self="open = false"
      >
        <div class="vote-voters__panel">
          <div class="vote-voters__header">
            <strong>Голосующие</strong>
            <button
              type="button"
              class="vote-voters__close"
              @click="open = false"
            >
              ✕
            </button>
          </div>
          <div class="vote-voters__tabs">
            <button
              type="button"
              class="vote-voters__tab"
              :class="{ 'is-active': tab === 'plus' }"
              @click="tab = 'plus'"
            >
              +{{ plusCount }}
            </button>
            <button
              type="button"
              class="vote-voters__tab"
              :class="{ 'is-active': tab === 'minus' }"
              @click="tab = 'minus'"
            >
              −{{ minusCount }}
            </button>
          </div>
          <div class="vote-voters__body">
            <p
              v-if="loading"
              class="vote-voters__muted"
            >
              Загрузка…
            </p>
            <p
              v-else-if="activeVoters.length === 0"
              class="vote-voters__muted"
            >
              Нет голосов
            </p>
            <ul
              v-else
              class="vote-voters__list"
            >
              <li
                v-for="v in activeVoters"
                :key="v.userId"
                class="vote-voters__item"
              >
                <RouterLink
                  :to="profileTo(v.userId)"
                  class="vote-voters__user"
                  @click="open = false"
                >
                  <UserAvatar
                    size="sm"
                    :label="v.userId"
                    :user-id="v.userId"
                  />
                  <span>{{ v.userId.slice(0, 8) }}…</span>
                </RouterLink>
                <span
                  v-if="v.reason"
                  class="vote-voters__reason"
                >
                  {{ v.reason }}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.vote-voters {
  display: inline-flex;
}

.vote-voters__trigger {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  cursor: pointer;
  color: inherit;
}

.vote-voters__trigger.is-disabled {
  cursor: default;
  opacity: 0.5;
}

.vote-voters__overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.vote-voters__panel {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  width: 20rem;
  max-height: 60vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.vote-voters__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
}

.vote-voters__close {
  background: none;
  border: none;
  font: inherit;
  cursor: pointer;
  color: var(--color-text-muted);
}

.vote-voters__tabs {
  display: flex;
  border-bottom: 1px solid var(--color-border);
}

.vote-voters__tab {
  flex: 1;
  padding: 0.5rem;
  border: none;
  background: none;
  font: inherit;
  font-weight: 500;
  cursor: pointer;
  color: var(--color-text-muted);
  border-bottom: 2px solid transparent;
}

.vote-voters__tab.is-active {
  color: var(--color-text);
  border-bottom-color: var(--color-primary);
}

.vote-voters__body {
  padding: 0.5rem;
  overflow-y: auto;
  flex: 1;
}

.vote-voters__muted {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  text-align: center;
  padding: 1rem;
}

.vote-voters__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.vote-voters__item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.5rem;
  border-radius: 0.375rem;
}

.vote-voters__item:hover {
  background: var(--color-hover);
}

.vote-voters__user {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--color-primary);
  text-decoration: none;
  font-size: 0.8rem;
}

.vote-voters__user:hover {
  text-decoration: underline;
}

.vote-voters__reason {
  font-size: 0.7rem;
  color: var(--color-text-muted);
  margin-left: auto;
  max-width: 8rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
