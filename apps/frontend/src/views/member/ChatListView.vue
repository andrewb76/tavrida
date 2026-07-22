<script setup lang="ts">
import {
  chatKindLabel,
  chatListTitle,
  getOrCreateSelfChat,
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

function formatTime(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
</script>

<template>
  <section class="space-y-4">
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
      >
        <RouterLink
          :to="{ name: 'chat-room', params: { chatId: row.id } }"
          class="flex items-center gap-3 px-3 py-3 hover:bg-bg"
        >
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="truncate font-medium text-text">
                {{ chatListTitle(row) }}
              </span>
              <span
                v-if="row.unreadCount > 0"
                class="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-fg tabular-nums"
              >
                {{ row.unreadCount }}
              </span>
            </div>
            <p class="truncate text-xs text-text-muted">
              {{ chatKindLabel(row.kind, row.self) }}
              <template v-if="row.lastMessageAt">
                · {{ formatTime(row.lastMessageAt) }}
              </template>
            </p>
          </div>
          <UiIcon
            name="chevronRight"
            :size="16"
            class="shrink-0 text-text-muted"
          />
        </RouterLink>
      </li>
    </ul>
  </section>
</template>
