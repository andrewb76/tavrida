<script setup lang="ts">
import { useWs } from '@/composables/useWs';
import {
  getTopicChat,
  listChatMessages,
  markChatRead,
  sendChatMessage,
  type ChatDto,
  type ChatMessage,
} from '@/services/chats';
import { useChatsStore } from '@/stores/chats';
import { useSessionStore } from '@/stores/session';
import { UiButton, UiIcon } from '@tavrida/ui';
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { toast } from 'vue-sonner';

const props = defineProps<{
  open: boolean;
  forumTopicId: string;
  topicTitle?: string;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

const session = useSessionStore();
const chatsStore = useChatsStore();
const ws = useWs();

const chat = ref<ChatDto | null>(null);
const messages = ref<ChatMessage[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const body = ref('');
const sending = ref(false);
const listEl = ref<HTMLElement | null>(null);
let wsUnsub: (() => void) | null = null;

watch(
  () => [props.open, props.forumTopicId] as const,
  ([open, topicId]) => {
    if (open && topicId) void load(topicId);
    if (!open) {
      wsUnsub?.();
      wsUnsub = null;
    }
  },
);

onBeforeUnmount(() => {
  wsUnsub?.();
  wsUnsub = null;
});

function onWsEvent(ev: { event: string; payload: Record<string, unknown> }) {
  if (ev.event !== 'message.new' || !chat.value) return;
  const p = ev.payload;
  const id = String(p.messageId ?? '');
  if (!id || messages.value.some((m) => m.id === id)) return;
  if (p.authorId === session.userId) return;
  messages.value.push({
    id,
    chatId: chat.value.id,
    authorId: String(p.authorId ?? ''),
    body: String(p.body ?? ''),
    mentions: (p.mentions as ChatMessage['mentions']) ?? [],
    createdAt: String(p.createdAt ?? new Date().toISOString()),
    editedAt: null,
    deletedAt: null,
    status: null,
    replyToMessageId: (p.replyToMessageId as string | null) ?? null,
    replyTo: (p.replyTo as ChatMessage['replyTo']) ?? null,
  });
  void markChatRead(chat.value.id, id);
  void chatsStore.refreshUnread();
  void nextTick().then(scrollToBottom);
}

async function load(topicId: string) {
  loading.value = true;
  error.value = null;
  chat.value = null;
  messages.value = [];
  wsUnsub?.();
  wsUnsub = null;
  try {
    const chatRow = await getTopicChat(topicId);
    chat.value = chatRow;
    const msgRows = await listChatMessages(chatRow.id);
    messages.value = msgRows;
    const last = msgRows[msgRows.length - 1];
    await markChatRead(chatRow.id, last?.id);
    void chatsStore.refreshUnread();
    try {
      wsUnsub = await ws.subscribe(`chat:${chatRow.id}`, onWsEvent);
    } catch {
      /* REST fallback */
    }
    await nextTick();
    scrollToBottom();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Чат темы недоступен';
  } finally {
    loading.value = false;
  }
}

function close() {
  emit('update:open', false);
}

function scrollToBottom() {
  const el = listEl.value;
  if (el) el.scrollTop = el.scrollHeight;
}

async function send() {
  const text = body.value.trim();
  if (!text || !chat.value || sending.value) return;
  sending.value = true;
  try {
    const msg = await sendChatMessage(chat.value.id, text);
    messages.value.push(msg);
    body.value = '';
    await markChatRead(chat.value.id, msg.id);
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
  return new Date(iso).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function onBackdrop(e: MouseEvent) {
  if (e.target === e.currentTarget) close();
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="topic-chat-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="topic-chat-title"
      @click="onBackdrop"
    >
      <div class="topic-chat-sheet__panel">
        <header class="topic-chat-sheet__head">
          <div class="min-w-0 flex-1">
            <h2
              id="topic-chat-title"
              class="truncate text-base font-semibold text-text"
            >
              Чат темы
            </h2>
            <p
              v-if="topicTitle"
              class="truncate text-xs text-text-muted"
            >
              {{ topicTitle }}
            </p>
          </div>
          <UiButton
            intent="ghost"
            size="icon"
            type="button"
            aria-label="Закрыть"
            @click="close"
          >
            <UiIcon
              name="close"
              :size="18"
            />
          </UiButton>
        </header>

        <p
          v-if="loading"
          class="px-4 py-6 text-sm text-text-muted"
        >
          Загрузка…
        </p>
        <p
          v-else-if="error"
          class="px-4 py-6 text-sm text-danger"
        >
          {{ error }}
        </p>

        <template v-else>
          <div
            ref="listEl"
            class="topic-chat-sheet__messages"
          >
            <p
              v-if="!messages.length"
              class="text-sm text-text-muted"
            >
              Пока нет сообщений в чате темы.
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
                <time class="mt-1 block text-[10px] opacity-70">
                  {{ formatTime(msg.createdAt) }}
                </time>
              </div>
            </div>
          </div>

          <form
            class="topic-chat-sheet__compose"
            @submit.prevent="send"
          >
            <textarea
              v-model="body"
              rows="2"
              class="min-h-11 flex-1 resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
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
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.topic-chat-sheet {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: flex-end;
  background: rgb(0 0 0 / 0.4);
}

.topic-chat-sheet__panel {
  display: flex;
  max-height: min(85dvh, 640px);
  width: 100%;
  flex-direction: column;
  border-radius: 1rem 1rem 0 0;
  background: var(--color-surface, #fff);
  box-shadow: 0 -8px 32px rgb(0 0 0 / 0.12);
}

.topic-chat-sheet__head {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  border-bottom: 1px solid var(--color-border, #e5e5e5);
  padding: 0.75rem 1rem;
}

.topic-chat-sheet__messages {
  min-height: 12rem;
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.topic-chat-sheet__compose {
  display: flex;
  gap: 0.5rem;
  border-top: 1px solid var(--color-border, #e5e5e5);
  padding: 0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom, 0px));
}
</style>
