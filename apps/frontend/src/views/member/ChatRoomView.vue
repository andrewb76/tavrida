<script setup lang="ts">
import { logtoAccountUsernameUrl } from '@/config/logto';
import {
  chatListTitle,
  getChat,
  listChatMessages,
  markChatRead,
  messageStatusLabel,
  searchChatUsers,
  sendChatMessage,
  spawnGroupFromDirect,
  type ChatDto,
  type ChatMessage,
  type ChatUserHit,
  type MessageDeliveryStatus,
} from '@/services/chats';
import { useChatsStore } from '@/stores/chats';
import { useSessionStore } from '@/stores/session';
import { UiButton, UiIcon } from '@tavrida/ui';
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
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
const composeEl = ref<HTMLTextAreaElement | null>(null);

const mentionHits = ref<ChatUserHit[]>([]);
const mentionOpen = ref(false);
const mentionQuery = ref('');
const mentionStart = ref<number | null>(null);
let mentionTimer: ReturnType<typeof setTimeout> | null = null;

const title = computed(() => {
  if (!chat.value) return 'Чат';
  return chatListTitle(chat.value);
});

const canSpawnGroup = computed(
  () => chat.value?.kind === 'DIRECT' && !chat.value.self,
);

const showStatus = computed(() => Boolean(chat.value && !chat.value.self));

const usernameAccountUrl = computed(() => logtoAccountUsernameUrl());

const needsUsernameBanner = computed(
  () => Boolean(session.logtoEnabled && session.isAuthenticated && !session.username),
);

watch(chatId, (id) => void load(id), { immediate: true });

onBeforeUnmount(() => {
  if (mentionTimer) clearTimeout(mentionTimer);
});

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

function onComposeInput() {
  const el = composeEl.value;
  if (!el) return;
  const value = body.value;
  const caret = el.selectionStart ?? value.length;
  const before = value.slice(0, caret);
  const match = before.match(/(^|[\s([{])@([A-Za-z_][\w]{0,31})$/);
  if (!match) {
    closeMention();
    return;
  }
  mentionStart.value = caret - (match[2]?.length ?? 0) - 1;
  mentionQuery.value = match[2] ?? '';
  mentionOpen.value = true;
  if (mentionTimer) clearTimeout(mentionTimer);
  mentionTimer = setTimeout(() => {
    void runMentionSearch(mentionQuery.value);
  }, 180);
}

async function runMentionSearch(q: string) {
  if (!q) {
    mentionHits.value = [];
    return;
  }
  try {
    mentionHits.value = await searchChatUsers(q);
  } catch {
    mentionHits.value = [];
  }
}

function closeMention() {
  mentionOpen.value = false;
  mentionHits.value = [];
  mentionStart.value = null;
  mentionQuery.value = '';
}

function insertMention(hit: ChatUserHit) {
  if (!hit.username || mentionStart.value == null) return;
  const el = composeEl.value;
  const start = mentionStart.value;
  const caret = el?.selectionStart ?? body.value.length;
  const insert = `@${hit.username} `;
  body.value = `${body.value.slice(0, start)}${insert}${body.value.slice(caret)}`;
  closeMention();
  void nextTick(() => {
    if (!composeEl.value) return;
    const pos = start + insert.length;
    composeEl.value.focus();
    composeEl.value.setSelectionRange(pos, pos);
  });
}

async function send() {
  const text = body.value.trim();
  if (!text || sending.value) return;
  if (text.includes('@') && needsUsernameBanner.value) {
    toast.message('Задайте @ник в Account Center, чтобы упоминания работали для вас');
  }
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
  closeMention();
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

type BodyPart =
  | { type: 'text'; text: string }
  | { type: 'mention'; text: string; userId: string; username: string };

function messageParts(msg: ChatMessage): BodyPart[] {
  if (!msg.mentions?.length) {
    return [{ type: 'text', text: msg.body }];
  }
  const sorted = [...msg.mentions].sort((a, b) => a.offset - b.offset);
  const parts: BodyPart[] = [];
  let cursor = 0;
  for (const m of sorted) {
    if (m.offset > cursor) {
      parts.push({ type: 'text', text: msg.body.slice(cursor, m.offset) });
    }
    parts.push({
      type: 'mention',
      text: msg.body.slice(m.offset, m.offset + m.length),
      userId: m.userId,
      username: m.username,
    });
    cursor = m.offset + m.length;
  }
  if (cursor < msg.body.length) {
    parts.push({ type: 'text', text: msg.body.slice(cursor) });
  }
  return parts;
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
      v-if="needsUsernameBanner"
      class="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-muted"
    >
      Чтобы упоминать участников через
      <span class="text-text">@ник</span>, задайте свой handle в Logto.
      <a
        v-if="usernameAccountUrl"
        :href="usernameAccountUrl"
        class="ml-1 text-primary hover:underline"
      >Изменить @ник</a>
    </p>

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
              <template
                v-for="(part, idx) in messageParts(msg)"
                :key="idx"
              >
                <RouterLink
                  v-if="part.type === 'mention'"
                  :to="{ name: 'profile-user', params: { userId: part.userId } }"
                  class="font-medium underline underline-offset-2"
                  @click.stop
                >
                  {{ part.text }}
                </RouterLink>
                <template v-else>{{ part.text }}</template>
              </template>
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

      <div class="relative">
        <ul
          v-if="mentionOpen && mentionHits.length"
          class="absolute bottom-full left-0 z-10 mb-1 max-h-40 w-full overflow-y-auto rounded-md border border-border bg-surface shadow-md"
          role="listbox"
        >
          <li
            v-for="hit in mentionHits"
            :key="hit.userId"
          >
            <button
              type="button"
              class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-bg"
              @mousedown.prevent="insertMention(hit)"
            >
              <span class="font-medium text-text">@{{ hit.username }}</span>
              <span
                v-if="hit.displayName"
                class="truncate text-text-muted"
              >{{ hit.displayName }}</span>
            </button>
          </li>
        </ul>

        <form
          class="flex gap-2"
          @submit.prevent="send"
        >
          <label class="sr-only" for="chat-compose">Сообщение</label>
          <textarea
            id="chat-compose"
            ref="composeEl"
            v-model="body"
            rows="2"
            class="min-h-11 flex-1 resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Сообщение… (@ник)"
            @input="onComposeInput"
            @keydown.enter.exact.prevent="send"
            @keydown.escape="closeMention"
          />
          <UiButton
            intent="primary"
            type="submit"
            :disabled="sending || !body.trim()"
          >
            Отправить
          </UiButton>
        </form>
      </div>
    </template>
  </section>
</template>
