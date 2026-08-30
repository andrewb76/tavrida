<script setup lang="ts">
import { inviteToGroup, searchChatUsers, type ChatUserHit } from '@/services/chats';
import { UiIcon } from '@tavrida/ui';
import { ref, watch } from 'vue';
import { toast } from 'vue-sonner';

const props = defineProps<{
  chatId: string;
}>();

const emit = defineEmits<{
  close: [];
  invited: [];
}>();

const query = ref('');
const hits = ref<ChatUserHit[]>([]);
const searching = ref(false);
const inviting = ref<string | null>(null);
let timer: ReturnType<typeof setTimeout> | null = null;

watch(query, (q) => {
  if (timer) clearTimeout(timer);
  if (!q.trim()) {
    hits.value = [];
    return;
  }
  searching.value = true;
  timer = setTimeout(async () => {
    try {
      hits.value = await searchChatUsers(q.trim());
    } catch {
      hits.value = [];
    } finally {
      searching.value = false;
    }
  }, 300);
});

async function invite(userId: string) {
  if (inviting.value) return;
  inviting.value = userId;
  try {
    await inviteToGroup(props.chatId, [userId]);
    toast.success('Приглашён');
    emit('invited');
    emit('close');
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Не удалось пригласить');
  } finally {
    inviting.value = null;
  }
}

function onOverlayClick(ev: MouseEvent) {
  if (ev.target === ev.currentTarget) emit('close');
}
</script>

<template>
  <Teleport to="body">
    <div class="invite-sheet" @click="onOverlayClick">
      <div class="invite-sheet__panel" role="dialog" aria-label="Пригласить участника">
        <div class="invite-sheet__header">
          <h2 class="invite-sheet__title">Пригласить участника</h2>
          <button type="button" class="invite-sheet__close" @click="emit('close')">
            <UiIcon name="close" :size="20" label="Закрыть" />
          </button>
        </div>
        <div class="invite-sheet__search">
          <UiIcon name="search" :size="18" class="invite-sheet__search-icon" />
          <input
            v-model="query"
            type="text"
            class="invite-sheet__input"
            placeholder="Имя или @ник…"
            autofocus
          >
        </div>
        <div class="invite-sheet__results">
          <p v-if="searching" class="invite-sheet__hint">Поиск…</p>
          <p v-else-if="query && !hits.length" class="invite-sheet__hint">Ничего не найдено</p>
          <button
            v-for="hit in hits"
            :key="hit.userId"
            type="button"
            class="invite-sheet__user"
            :disabled="inviting !== null"
            @click="invite(hit.userId)"
          >
            <img
              v-if="hit.avatarUrl"
              :src="hit.avatarUrl"
              :alt="hit.displayName || hit.username || ''"
              class="invite-sheet__avatar"
            >
            <span v-else class="invite-sheet__avatar invite-sheet__avatar--placeholder">
              {{ (hit.displayName || hit.username || '?')[0]?.toUpperCase() }}
            </span>
            <span class="invite-sheet__user-info">
              <span class="invite-sheet__user-name">{{ hit.displayName || hit.username }}</span>
              <span v-if="hit.username" class="invite-sheet__user-handle">@{{ hit.username }}</span>
            </span>
            <span class="invite-sheet__user-action">
              <UiIcon
                v-if="inviting === hit.userId"
                name="check"
                :size="18"
                label="Добавляется"
              />
              <UiIcon v-else name="plus" :size="18" label="Пригласить" />
            </span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.invite-sheet {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgb(0 0 0 / 0.4);
  padding: 0.75rem;
  padding-bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px));
}

@media (min-width: 640px) {
  .invite-sheet {
    align-items: center;
  }
}

.invite-sheet__panel {
  width: min(100%, 28rem);
  max-height: 80dvh;
  border-radius: var(--token-radius-lg);
  background: var(--token-surface);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.invite-sheet__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem 0.5rem;
  border-bottom: 1px solid var(--token-border);
}

.invite-sheet__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--token-text);
}

.invite-sheet__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  color: var(--token-text-muted);
}

.invite-sheet__close:hover {
  background: var(--token-bg);
  color: var(--token-text);
}

.invite-sheet__search {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--token-border);
}

.invite-sheet__search-icon {
  flex-shrink: 0;
  color: var(--token-text-muted);
}

.invite-sheet__input {
  flex: 1;
  min-width: 0;
  border: none;
  background: none;
  font-size: 0.9375rem;
  color: var(--token-text);
  outline: none;
}

.invite-sheet__input::placeholder {
  color: var(--token-text-muted);
}

.invite-sheet__results {
  overflow-y: auto;
  overscroll-behavior: contain;
  flex: 1;
  padding: 0.25rem;
}

.invite-sheet__hint {
  margin: 0;
  padding: 1.5rem 1rem;
  text-align: center;
  font-size: 0.875rem;
  color: var(--token-text-muted);
}

.invite-sheet__user {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  text-align: left;
  padding: 0.65rem 0.75rem;
  border-radius: var(--token-radius-sm);
}

.invite-sheet__user:hover:not(:disabled) {
  background: var(--token-bg);
}

.invite-sheet__user:disabled {
  opacity: 0.5;
}

.invite-sheet__avatar {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 999px;
  object-fit: cover;
  flex-shrink: 0;
}

.invite-sheet__avatar--placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--token-primary);
  color: var(--color-primary-fg);
  font-size: 0.875rem;
  font-weight: 600;
}

.invite-sheet__user-info {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
}

.invite-sheet__user-name {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--token-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.invite-sheet__user-handle {
  font-size: 0.75rem;
  color: var(--token-text-muted);
}

.invite-sheet__user-action {
  flex-shrink: 0;
  color: var(--token-primary);
}
</style>
