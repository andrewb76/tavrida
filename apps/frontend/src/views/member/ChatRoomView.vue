<script setup lang="ts">
import {
  chatListTitle,
  getChat,
  listChatMessages,
  markChatRead,
  messageStatusLabel,
  sendChatMessage,
  spawnGroupFromDirect,
  type ChatDto,
  type ChatMessage,
  type MessageDeliveryStatus,
} from '@/services/chats';
import { useChatsStore } from '@/stores/chats';
import { useSessionStore } from '@/stores/session';
import { UiButton, UiIcon } from '@tavrida/ui';
import { computed, nextTick, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { toast } from 'vue-sonner';

const route = useRoute();
const router = useRouter();
const session = useSessionStore();
const chatsStore = useChatsStore();

const chatId = computed(() => route.params.chatId as string);
const chat = ref<ChatDto | null>(null);
const messages = ref<ChatMessage[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const body = ref('');
const sending = ref(false);
const spawning = ref(false);
const listEl = ref<HTMLElement | null>(null);

const title = computed(() => {
  if (!chat.value) return 'Чат';
  return chatListTitle(chat.value);
});

const canSpawnGroup = computed(
  () => chat.value?.kind === 'DIRECT' && !chat.value.self,
);

const showStatus = computed(() => Boolean(chat.value && !chat.value.self));

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

async function spawnGroup() {
  if (!canSpawnGroup.value || spawning.value) return;
  const groupTitle = window.prompt('Название группы', 'Группа')?.trim();
  if (groupTitle === undefined) return;
  const copyRaw = window.prompt('Сколько последних сообщений скопировать? (0 = без истории)', '25');
  if (copyRaw === null) return;
  const copyCount = Math.max(0, Number.parseInt(copyRaw, 10) || 0);
  spawning.value = true;
  try {
    const group = await spawnGroupFromDirect(chatId.value, {
      title: groupTitle || undefined,
      copyHistory: copyCount > 0,
      copyCount,
    });
    toast.success('Группа создана');
    await router.push({ name: 'chat-room', params: { chatId: group.id } });
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Не удалось создать группу');
  } finally {
    spawning.value = false;
  }
}

async function send() {
  const text = body.value.trim();
  if (!text || sending.value) return;
  sending.value = true;
  const tempId = `tmp-${Date.now()}`;
  const optimistic: ChatMessage = {
    id: tempId,
    chatId: chatId.value,
    authorId: session.userId ?? '',
    body: text,
    mentions: [],
    createdAt: new Date().toISOString(),
    editedAt: null,
    deletedAt: null,
    status: 'SENDING',
  };
  messages.value.push(optimistic);
  body.value = '';
  await nextTick();
  scrollToBottom();

  try {
    const msg = await sendChatMessage(chatId.value, text);
    const idx = messages.value.findIndex((m) => m.id === tempId);
    if (idx >= 0) {
      messages.value[idx] = msg;
    } else {
      messages.value.push(msg);
    }
    await markChatRead(chatId.value, msg.id);
    void chatsStore.refreshUnread();
    await nextTick();
    scrollToBottom();
  } catch (e) {
    messages.value = messages.value.filter((m) => m.id !== tempId);
    body.value = text;
    toast.error(e instanceof Error ? e.message : 'Не удалось отправить');
  } finally {
    sending.value = false;
  }
}

function isMine(msg: ChatMessage) {
  return msg.authorId === session.userId;
}

function statusGlyph(status: MessageDeliveryStatus | null | undefined): string {
  if (status === 'SENDING') return '…';
  if (status === 'DELIVERED') return '✓';
  if (status === 'READ') return '✓✓';
  return '';
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
        <p
          v-else-if="chat?.kind === 'DIRECT' && !chat.self && chat.peer?.username"
          class="truncate text-xs text-text-muted"
        >
          @{{ chat.peer.username }}
        </p>
      </div>
      <UiButton
        v-if="canSpawnGroup"
        intent="secondary"
        size="sm"
        type="button"
        :disabled="spawning"
        @click="spawnGroup"
      >
        {{ spawning ? '…' : 'Группа' }}
      </UiButton>
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
            <div
              class="mt-1 flex items-center justify-end gap-1.5 text-[10px] opacity-70"
            >
              <time :datetime="msg.createdAt">
                {{ formatTime(msg.createdAt) }}
              </time>
              <span
                v-if="showStatus && isMine(msg) && msg.status"
                class="tabular-nums"
                :title="messageStatusLabel(msg.status)"
                :aria-label="messageStatusLabel(msg.status)"
              >
                {{ statusGlyph(msg.status) }}
              </span>
            </div>
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
