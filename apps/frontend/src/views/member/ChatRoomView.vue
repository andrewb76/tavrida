<script setup lang="ts">
import {
  getChat,
  listChatMessages,
  markChatRead,
  sendChatMessage,
  type ChatDto,
  type ChatMessage,
} from '@/services/chats';
import { useChatsStore } from '@/stores/chats';
import { useSessionStore } from '@/stores/session';
import { UiButton, UiIcon } from '@tavrida/ui';
import { computed, nextTick, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { toast } from 'vue-sonner';

const route = useRoute();
const session = useSessionStore();
const chatsStore = useChatsStore();

const chatId = computed(() => route.params.chatId as string);
const chat = ref<ChatDto | null>(null);
const messages = ref<ChatMessage[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const body = ref('');
const sending = ref(false);
const listEl = ref<HTMLElement | null>(null);

const title = computed(() => {
  if (!chat.value) return 'Чат';
  if (chat.value.title?.trim()) return chat.value.title.trim();
  if (chat.value.self) return 'Заметки';
  return 'Чат';
});

watch(chatId, (id) => void load(id), { immediate: true });

async function load(id: string) {
  loading.value = true;
  error.value = null;
  chat.value = null;
  messages.value = [];
  try {
    const [chatRow, msgRows] = await Promise.all([
      getChat(id),
      listChatMessages(id),
    ]);
    chat.value = chatRow;
    messages.value = msgRows;
    const last = msgRows[msgRows.length - 1];
    await markChatRead(id, last?.id);
    void chatsStore.refreshUnread();
    await nextTick();
    scrollToBottom();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось открыть чат';
  } finally {
    loading.value = false;
  }
}

function scrollToBottom() {
  const el = listEl.value;
  if (el) el.scrollTop = el.scrollHeight;
}

async function send() {
  const text = body.value.trim();
  if (!text || sending.value) return;
  sending.value = true;
  try {
    const msg = await sendChatMessage(chatId.value, text);
    messages.value.push(msg);
    body.value = '';
    await markChatRead(chatId.value, msg.id);
    void chatsStore.refreshUnread();
    await nextTick();
    scrollToBottom();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Не удалось отправить');
  } finally {
    sending.value = false;
  }
}

function isMine(msg: ChatMessage) {
  return msg.authorId === session.userId;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
</script>

<template>
  <section class="flex min-h-[70dvh] flex-col gap-3">
    <header class="flex items-center gap-2">
      <RouterLink
        to="/chats"
        class="inline-flex h-9 w-9 items-center justify-center rounded-md text-text-muted hover:bg-bg hover:text-text"
        title="К списку"
      >
        <UiIcon
          name="chevronLeft"
          :size="20"
          label="Назад"
        />
      </RouterLink>
      <div class="min-w-0 flex-1">
        <h1 class="truncate text-lg font-semibold text-text">
          {{ title }}
        </h1>
        <p
          v-if="chat?.kind === 'TOPIC' && chat.contextId"
          class="truncate text-xs text-text-muted"
        >
          <RouterLink
            :to="{ name: 'forum-topic', params: { id: chat.contextId } }"
            class="hover:text-primary"
          >
            К теме форума
          </RouterLink>
        </p>
      </div>
    </header>

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

    <template v-else>
      <div
        ref="listEl"
        class="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-lg border border-border bg-surface p-3"
      >
        <p
          v-if="!messages.length"
          class="text-sm text-text-muted"
        >
          Пока нет сообщений. Напишите первое.
        </p>
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="flex"
          :class="isMine(msg) ? 'justify-end' : 'justify-start'"
        >
          <div
            class="max-w-[85%] rounded-2xl px-3 py-2 text-sm"
            :class="
              isMine(msg)
                ? 'bg-primary text-primary-fg'
                : 'bg-bg text-text'
            "
          >
            <p class="whitespace-pre-wrap break-words">
              {{ msg.body }}
            </p>
            <time
              class="mt-1 block text-[10px] opacity-70"
              :datetime="msg.createdAt"
            >
              {{ formatTime(msg.createdAt) }}
            </time>
          </div>
        </div>
      </div>

      <form
        class="flex gap-2"
        @submit.prevent="send"
      >
        <label class="sr-only" for="chat-compose">Сообщение</label>
        <textarea
          id="chat-compose"
          v-model="body"
          rows="2"
          class="min-h-11 flex-1 resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="Сообщение…"
          @keydown.enter.exact.prevent="send"
        />
        <UiButton
          intent="primary"
          type="submit"
          :disabled="sending || !body.trim()"
        >
          Отправить
        </UiButton>
      </form>
    </template>
  </section>
</template>
