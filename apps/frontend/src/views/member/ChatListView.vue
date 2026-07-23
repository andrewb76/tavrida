<script setup lang="ts">
import {
  chatKindLabel,
  chatListTitle,
  getOrCreateSelfChat,
  hideChat,
  listChats,
  type ChatKind,
  type ChatListItem,
} from '@/services/chats';
import { useChatsStore } from '@/stores/chats';
import { UiButton, UiIcon } from '@tavrida/ui';
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { toast } from 'vue-sonner';

type FilterKey = 'all' | ChatKind;

const router = useRouter();
const chatsStore = useChatsStore();

const rows = ref<ChatListItem[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const filter = ref<FilterKey>('all');
const openingSelf = ref(false);

const filters: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'Все' },
  { key: 'DIRECT', label: 'Личные' },
  { key: 'GROUP', label: 'Группы' },
  { key: 'TOPIC', label: 'Темы форума' },
];

const filtered = computed(() => {
  if (filter.value === 'all') return rows.value;
  return rows.value.filter((row) => row.kind === filter.value);
});

onMounted(load);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    rows.value = await listChats();
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

async function onHide(row: ChatListItem, ev: Event) {
  ev.preventDefault();
  ev.stopPropagation();
  try {
    await hideChat(row.id);
    rows.value = rows.value.filter((r) => r.id !== row.id);
    void chatsStore.refreshUnread();
    toast.success('Чат скрыт');
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Не удалось скрыть');
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
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function previewLine(row: ChatListItem): string {
  const text = row.lastMessagePreview?.trim();
  if (!text) return chatKindLabel(row.kind, row.self);
  return text;
}
</script>

<template>
  <section class="space-y-3">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold text-text">
          Чаты
        </h1>
        <p class="mt-1 text-sm text-text-muted">
          {{ chatsStore.unread.chatsWithUnread }} /
          {{ chatsStore.unread.totalUnreadMessages }} непрочитанных
        </p>
      </div>
      <UiButton
        intent="secondary"
        size="sm"
        type="button"
        :disabled="openingSelf"
        @click="openNotes"
      >
        Заметки
      </UiButton>
    </header>

    <div
      class="flex flex-wrap gap-1"
      role="tablist"
      aria-label="Фильтр чатов"
    >
      <button
        v-for="item in filters"
        :key="item.key"
        type="button"
        class="rounded-full px-3 py-1 text-sm transition-colors"
        :class="
          filter === item.key
            ? 'bg-primary text-primary-fg'
            : 'bg-bg text-text-muted hover:text-text'
        "
        @click="filter = item.key"
      >
        {{ item.label }}
      </button>
    </div>

    <p
      v-if="loading"
      class="text-sm text-text-muted"
    >
      Загрузка…
    </p>
    <p
      v-else-if="error"
      class="text-sm text-danger"
    >
      {{ error }}
    </p>
    <p
      v-else-if="!filtered.length"
      class="text-sm text-text-muted"
    >
      Пока нет чатов в этой категории.
    </p>

    <ul
      v-else
      class="divide-y divide-border rounded-lg border border-border bg-surface"
    >
      <li
        v-for="row in filtered"
        :key="row.id"
        class="group relative"
      >
        <RouterLink
          :to="{ name: 'chat-room', params: { chatId: row.id } }"
          class="flex items-start gap-3 px-3 py-2.5 hover:bg-bg"
        >
          <div class="min-w-0 flex-1">
            <div class="flex items-baseline gap-2">
              <span
                class="truncate font-medium text-text"
                :class="row.unreadCount > 0 ? 'font-semibold' : ''"
              >
                {{ chatListTitle(row) }}
              </span>
              <span class="ml-auto shrink-0 text-[11px] text-text-muted tabular-nums">
                {{ formatTime(row.lastMessageAt) }}
              </span>
            </div>
            <div class="mt-0.5 flex items-center gap-2">
              <p
                class="min-w-0 flex-1 truncate text-sm"
                :class="row.unreadCount > 0 ? 'text-text' : 'text-text-muted'"
              >
                {{ previewLine(row) }}
              </p>
              <span
                v-if="row.unreadCount > 0"
                class="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-fg tabular-nums"
              >
                {{ row.unreadCount }}
              </span>
            </div>
          </div>
        </RouterLink>
        <button
          type="button"
          class="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-md px-2 py-1 text-xs text-text-muted hover:bg-surface hover:text-text group-hover:inline-flex"
          title="Скрыть"
          @click="onHide(row, $event)"
        >
          Скрыть
        </button>
      </li>
    </ul>
  </section>
</template>
