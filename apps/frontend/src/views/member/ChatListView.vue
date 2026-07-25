<script setup lang="ts">
import {
  chatKindLabel,
  chatListTitle,
  getOrCreateSelfChat,
  hideChat,
  listChats,
  unhideChat,
  type ChatKind,
  type ChatListItem,
} from '@/services/chats';
import { useChatsStore } from '@/stores/chats';
import { UiIcon } from '@tavrida/ui';
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { toast } from 'vue-sonner';

type FilterKey = 'all' | 'hidden' | ChatKind;

const router = useRouter();
const chatsStore = useChatsStore();

const rows = ref<ChatListItem[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const filter = ref<FilterKey>('all');
const openingSelf = ref(false);
const actionRow = ref<ChatListItem | null>(null);
const actionBusy = ref(false);

const filters: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'Все' },
  { key: 'DIRECT', label: 'Личные' },
  { key: 'GROUP', label: 'Группы' },
  { key: 'TOPIC', label: 'Темы' },
  { key: 'hidden', label: 'Скрытые' },
];

const showingHidden = computed(() => filter.value === 'hidden');

const listHint = computed(() => {
  if (showingHidden.value) {
    return 'Скрытые только у вас. Верните чат или дождитесь нового сообщения — тогда он снова появится в основном списке.';
  }
  return null;
});

watch(filter, () => void load());

onMounted(load);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    if (filter.value === 'hidden') {
      rows.value = await listChats({ hidden: true });
    } else if (filter.value === 'all') {
      rows.value = await listChats();
    } else {
      rows.value = await listChats({ kind: filter.value });
    }
    void chatsStore.refreshUnread();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить чаты';
  } finally {
    loading.value = false;
  }
}

async function openNotes() {
  openingSelf.value = true;
  try {
    const chat = await getOrCreateSelfChat();
    await router.push({ name: 'chat-room', params: { chatId: chat.id } });
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Недоступно');
  } finally {
    openingSelf.value = false;
  }
}

function openActions(row: ChatListItem) {
  actionRow.value = row;
}

function closeActions() {
  if (actionBusy.value) return;
  actionRow.value = null;
}

async function confirmHide() {
  const row = actionRow.value;
  if (!row || actionBusy.value) return;
  actionBusy.value = true;
  try {
    await hideChat(row.id);
    rows.value = rows.value.filter((r) => r.id !== row.id);
    void chatsStore.refreshUnread();
    actionRow.value = null;
    toast.success('Чат убран из списка · вкладка «Скрытые»');
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Не удалось скрыть');
  } finally {
    actionBusy.value = false;
  }
}

async function confirmUnhide() {
  const row = actionRow.value;
  if (!row || actionBusy.value) return;
  actionBusy.value = true;
  try {
    await unhideChat(row.id);
    rows.value = rows.value.filter((r) => r.id !== row.id);
    void chatsStore.refreshUnread();
    actionRow.value = null;
    toast.success('Чат снова в списке');
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Не удалось вернуть');
  } finally {
    actionBusy.value = false;
  }
}

function formatTime(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  ) {
    return 'вчера';
  }
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function previewLine(row: ChatListItem): string {
  const text = row.lastMessagePreview?.trim();
  if (!text) return chatKindLabel(row.kind, row.self);
  return text;
}

function initials(title: string): string {
  const parts = title.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (!parts.length) return '?';
  return parts.map((p) => p[0]!.toUpperCase()).join('');
}

function avatarTone(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * (i + 1)) % 360;
  return h;
}
</script>

<template>
  <section class="chat-list">
    <header class="chat-list__header">
      <div class="min-w-0 flex-1">
        <h1 class="chat-list__title">
          Чаты
        </h1>
        <p
          v-if="chatsStore.unread.totalUnreadMessages > 0 && !showingHidden"
          class="chat-list__unread"
        >
          {{ chatsStore.unread.chatsWithUnread }} чат ·
          {{ chatsStore.unread.totalUnreadMessages }} непрочит.
        </p>
      </div>
      <button
        type="button"
        class="chat-list__notes"
        :disabled="openingSelf"
        title="Заметки"
        @click="openNotes"
      >
        <UiIcon
          name="edit"
          :size="18"
          label="Заметки"
        />
      </button>
    </header>

    <div
      class="chat-list__filters"
      role="tablist"
      aria-label="Фильтр чатов"
    >
      <button
        v-for="item in filters"
        :key="item.key"
        type="button"
        role="tab"
        class="chat-list__chip"
        :class="filter === item.key ? 'chat-list__chip--active' : ''"
        :aria-selected="filter === item.key"
        @click="filter = item.key"
      >
        {{ item.label }}
      </button>
    </div>

    <p
      v-if="listHint"
      class="chat-list__hint"
    >
      {{ listHint }}
    </p>

    <p
      v-if="loading"
      class="chat-list__state"
    >
      Загрузка…
    </p>
    <p
      v-else-if="error"
      class="chat-list__state chat-list__state--error"
    >
      {{ error }}
    </p>
    <p
      v-else-if="!rows.length"
      class="chat-list__state"
    >
      {{ showingHidden ? 'Нет скрытых чатов.' : 'Пока нет чатов в этой категории.' }}
    </p>

    <ul
      v-else
      class="chat-list__rows"
    >
      <li
        v-for="row in rows"
        :key="row.id"
        class="chat-list__row"
      >
        <RouterLink
          :to="{ name: 'chat-room', params: { chatId: row.id } }"
          class="chat-list__link"
          @click="actionRow = null"
        >
          <span
            class="chat-list__avatar"
            :style="{ '--hue': String(avatarTone(row.id)) }"
            aria-hidden="true"
          >
            {{ initials(chatListTitle(row)) }}
          </span>
          <span class="chat-list__body">
            <span class="chat-list__top">
              <span
                class="chat-list__name"
                :class="row.unreadCount > 0 ? 'chat-list__name--unread' : ''"
              >
                {{ chatListTitle(row) }}
              </span>
              <time class="chat-list__time">
                {{ formatTime(row.lastMessageAt) }}
              </time>
            </span>
            <span class="chat-list__bottom">
              <span
                class="chat-list__preview"
                :class="row.unreadCount > 0 ? 'chat-list__preview--unread' : ''"
              >
                {{ previewLine(row) }}
              </span>
              <span
                v-if="row.unreadCount > 0 && !showingHidden"
                class="chat-list__badge"
              >
                {{ row.unreadCount > 99 ? '99+' : row.unreadCount }}
              </span>
            </span>
          </span>
        </RouterLink>
        <button
          type="button"
          class="chat-list__more"
          title="Действия"
          @click.stop="openActions(row)"
        >
          <UiIcon
            name="more"
            :size="18"
            label="Действия"
          />
        </button>
      </li>
    </ul>

    <Teleport to="body">
      <div
        v-if="actionRow"
        class="chat-sheet"
        @click.self="closeActions"
      >
        <div
          class="chat-sheet__panel"
          role="dialog"
          :aria-label="showingHidden ? 'Скрытый чат' : 'Убрать чат из списка'"
        >
          <p class="chat-sheet__title">
            {{ chatListTitle(actionRow) }}
          </p>
          <p class="chat-sheet__copy">
            <template v-if="showingHidden">
              Чат скрыт только у вас. Можно вернуть в основной список.
              Новое сообщение от собеседника тоже вернёт его автоматически.
            </template>
            <template v-else>
              Убрать из списка — не удаление. История сохранится.
              Вернуть: вкладка «Скрытые», или когда кто-то напишет снова.
            </template>
          </p>
          <button
            v-if="showingHidden"
            type="button"
            :disabled="actionBusy"
            @click="confirmUnhide"
          >
            Вернуть в список
          </button>
          <button
            v-else
            type="button"
            :disabled="actionBusy"
            @click="confirmHide"
          >
            Убрать из списка
          </button>
          <button
            type="button"
            class="chat-sheet__cancel"
            :disabled="actionBusy"
            @click="closeActions"
          >
            Отмена
          </button>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.chat-list {
  display: flex;
  flex-direction: column;
  min-height: min(70dvh, 100%);
  background: var(--token-surface);
}

@media (min-width: 640px) {
  .chat-list {
    border: 1px solid var(--token-border);
    border-radius: var(--token-radius-lg);
    overflow: hidden;
  }
}

.chat-list__header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem 0.5rem;
  position: sticky;
  top: 0;
  z-index: 2;
  background: color-mix(in srgb, var(--token-surface) 94%, transparent);
  backdrop-filter: blur(8px);
}

.chat-list__title {
  margin: 0;
  font-size: 1.375rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--token-text);
}

.chat-list__unread {
  margin: 0.1rem 0 0;
  font-size: 0.75rem;
  color: var(--token-text-muted);
}

.chat-list__notes {
  display: inline-flex;
  width: 2.75rem;
  height: 2.75rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: var(--token-primary);
  background: color-mix(in srgb, var(--token-primary) 10%, transparent);
}

.chat-list__notes:disabled {
  opacity: 0.5;
}

.chat-list__filters {
  display: flex;
  gap: 0.35rem;
  overflow-x: auto;
  padding: 0.35rem 1rem 0.5rem;
  scrollbar-width: none;
}

.chat-list__filters::-webkit-scrollbar {
  display: none;
}

.chat-list__chip {
  flex-shrink: 0;
  border-radius: 999px;
  padding: 0.45rem 0.85rem;
  font-size: 0.8125rem;
  min-height: 2.25rem;
  color: var(--token-text-muted);
  background: var(--token-bg);
}

.chat-list__chip--active {
  background: var(--token-primary);
  color: var(--token-primary-fg, #fff);
}

.chat-list__hint {
  margin: 0;
  padding: 0 1rem 0.75rem;
  font-size: 0.75rem;
  line-height: 1.35;
  color: var(--token-text-muted);
}

.chat-list__state {
  margin: 0;
  padding: 1.5rem 1rem;
  text-align: center;
  font-size: 0.875rem;
  color: var(--token-text-muted);
}

.chat-list__state--error {
  color: var(--token-error);
}

.chat-list__rows {
  list-style: none;
  margin: 0;
  padding: 0;
}

.chat-list__row {
  position: relative;
  border-top: 1px solid color-mix(in srgb, var(--token-border) 70%, transparent);
}

.chat-list__link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 4.25rem;
  padding: 0.65rem 2.75rem 0.65rem 1rem;
}

.chat-list__link:active {
  background: var(--token-bg);
}

.chat-list__avatar {
  display: inline-flex;
  width: 3rem;
  height: 3rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 600;
  color: #fff;
  background: hsl(var(--hue, 200) 42% 42%);
}

.chat-list__body {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.chat-list__top,
.chat-list__bottom {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.chat-list__name {
  min-width: 0;
  flex: 1;
  font-size: 1rem;
  font-weight: 500;
  color: var(--token-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-list__name--unread {
  font-weight: 700;
}

.chat-list__time {
  flex-shrink: 0;
  font-size: 0.75rem;
  color: var(--token-text-muted);
  font-variant-numeric: tabular-nums;
}

.chat-list__preview {
  min-width: 0;
  flex: 1;
  font-size: 0.875rem;
  color: var(--token-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-list__preview--unread {
  color: var(--token-text);
}

.chat-list__badge {
  flex-shrink: 0;
  min-width: 1.25rem;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  background: var(--token-primary);
  color: var(--token-primary-fg, #fff);
  font-size: 0.6875rem;
  font-weight: 700;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.chat-list__more {
  position: absolute;
  right: 0.35rem;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  width: 2.5rem;
  height: 2.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: var(--token-text-muted);
}

.chat-sheet {
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

.chat-sheet__panel {
  width: min(100%, 24rem);
  border-radius: var(--token-radius-lg);
  background: var(--token-surface);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.chat-sheet__title {
  margin: 0;
  padding: 0.9rem 1rem 0.25rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--token-text);
}

.chat-sheet__copy {
  margin: 0;
  padding: 0 1rem 0.75rem;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: var(--token-text-muted);
  border-bottom: 1px solid var(--token-border);
}

.chat-sheet__panel > button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.95rem 1rem;
  font-size: 1rem;
  min-height: 3rem;
  color: var(--token-text);
}

.chat-sheet__panel > button:disabled {
  opacity: 0.5;
}

.chat-sheet__panel > button:active:not(:disabled) {
  background: var(--token-bg);
}

.chat-sheet__cancel {
  border-top: 1px solid var(--token-border);
  color: var(--token-text-muted) !important;
}
</style>
