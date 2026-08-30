<script setup lang="ts">
import { listGroupMembers, type GroupMember } from '@/services/chats';
import { usePresenceStore } from '@/stores/presence';
import { UiIcon } from '@tavrida/ui';
import { computed, onMounted, ref } from 'vue';

const props = defineProps<{
  chatId: string;
}>();

const emit = defineEmits<{
  close: [];
  invite: [];
}>();

const presenceStore = usePresenceStore();
const members = ref<GroupMember[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    members.value = await listGroupMembers(props.chatId);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка загрузки';
  } finally {
    loading.value = false;
  }
});

async function reload() {
  loading.value = true;
  error.value = null;
  try {
    members.value = await listGroupMembers(props.chatId);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка загрузки';
  } finally {
    loading.value = false;
  }
}

defineExpose({ reload });

const sortedMembers = computed(() => {
  const roleOrder: Record<string, number> = { OWNER: 0, ADMIN: 1, MEMBER: 2 };
  return [...members.value].sort((a, b) => {
    const ra = roleOrder[a.role] ?? 99;
    const rb = roleOrder[b.role] ?? 99;
    if (ra !== rb) return ra - rb;
    return (a.displayName ?? a.username ?? '').localeCompare(b.displayName ?? b.username ?? '');
  });
});

const ownerCount = computed(() => members.value.filter((m) => m.role === 'OWNER').length);

function presenceLabel(status: string | undefined): string {
  if (status === 'online') return 'в сети';
  if (status === 'away') return 'отошёл(а)';
  return '';
}

function roleLabel(role: string): string {
  if (role === 'OWNER') return 'Владелец';
  if (role === 'ADMIN') return 'Админ';
  return '';
}

function onOverlayClick(ev: MouseEvent) {
  if (ev.target === ev.currentTarget) emit('close');
}
</script>

<template>
  <Teleport to="body">
    <div class="members-panel" @click="onOverlayClick">
      <div class="members-panel__sheet" role="dialog" aria-label="Участники группы">
        <div class="members-panel__header">
          <h2 class="members-panel__title">
            Участники · {{ members.length }}
          </h2>
          <div class="members-panel__actions">
            <button
              type="button"
              class="members-panel__icon-btn"
              title="Пригласить"
              @click="emit('invite')"
            >
              <UiIcon name="user-plus" :size="18" label="Пригласить" />
            </button>
            <button
              type="button"
              class="members-panel__icon-btn"
              title="Закрыть"
              @click="emit('close')"
            >
              <UiIcon name="close" :size="20" label="Закрыть" />
            </button>
          </div>
        </div>

        <div class="members-panel__body">
          <p v-if="loading" class="members-panel__hint">Загрузка…</p>
          <p v-else-if="error" class="members-panel__hint members-panel__hint--error">{{ error }}</p>
          <template v-else>
            <div
              v-for="member in sortedMembers"
              :key="member.userId"
              class="members-panel__row"
            >
              <div class="members-panel__avatar-wrap">
                <img
                  v-if="member.avatarUrl"
                  :src="member.avatarUrl"
                  :alt="member.displayName || member.username || ''"
                  class="members-panel__avatar"
                >
                <span v-else class="members-panel__avatar members-panel__avatar--placeholder">
                  {{ (member.displayName || member.username || '?')[0]?.toUpperCase() }}
                </span>
                <span
                  v-if="member.presenceStatus && member.presenceStatus !== 'offline'"
                  class="members-panel__presence"
                  :class="{
                    'members-panel__presence--online': member.presenceStatus === 'online',
                    'members-panel__presence--away': member.presenceStatus === 'away',
                  }"
                />
              </div>
              <div class="members-panel__info">
                <span class="members-panel__name">
                  {{ member.displayName || member.username || member.userId.slice(0, 8) }}
                </span>
                <span class="members-panel__meta">
                  <template v-if="member.username">@{{ member.username }}</template>
                  <template v-if="roleLabel(member.role)">
                    · {{ roleLabel(member.role) }}
                  </template>
                  <template v-if="presenceLabel(member.presenceStatus)">
                    · {{ presenceLabel(member.presenceStatus) }}
                  </template>
                </span>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.members-panel {
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
  .members-panel {
    align-items: stretch;
    justify-content: flex-end;
  }
}

.members-panel__sheet {
  width: min(100%, 24rem);
  max-height: 80dvh;
  border-radius: var(--token-radius-lg);
  background: var(--token-surface);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

@media (min-width: 640px) {
  .members-panel__sheet {
    border-radius: var(--token-radius-lg) 0 0 var(--token-radius-lg);
    max-height: 100%;
    height: 100%;
  }
}

.members-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem 0.5rem;
  border-bottom: 1px solid var(--token-border);
  flex-shrink: 0;
}

.members-panel__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--token-text);
}

.members-panel__actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.members-panel__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 999px;
  color: var(--token-text-muted);
}

.members-panel__icon-btn:hover {
  background: var(--token-bg);
  color: var(--token-text);
}

.members-panel__body {
  overflow-y: auto;
  overscroll-behavior: contain;
  flex: 1;
  padding: 0.25rem 0;
}

.members-panel__hint {
  margin: 0;
  padding: 1.5rem 1rem;
  text-align: center;
  font-size: 0.875rem;
  color: var(--token-text-muted);
}

.members-panel__hint--error {
  color: var(--token-error);
}

.members-panel__row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
}

.members-panel__avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.members-panel__avatar {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 999px;
  object-fit: cover;
}

.members-panel__avatar--placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--token-primary);
  color: var(--color-primary-fg);
  font-size: 0.9375rem;
  font-weight: 600;
}

.members-panel__presence {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid var(--token-surface);
  background: var(--color-gray-400);
}

.members-panel__presence--online {
  background: #22c55e;
}

.members-panel__presence--away {
  background: #f59e0b;
}

.members-panel__info {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
}

.members-panel__name {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--token-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.members-panel__meta {
  font-size: 0.75rem;
  color: var(--token-text-muted);
}
</style>
