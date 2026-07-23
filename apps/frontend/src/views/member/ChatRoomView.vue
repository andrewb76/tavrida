<script setup lang="ts">
import { useWs } from '@/composables/useWs';
import { useMediaUpload } from '@/composables/useMediaUpload';
import { logtoAccountUsernameUrl } from '@/config/logto';
import AttachmentList from '@/components/media/AttachmentList.vue';
import MediaUploader from '@/components/media/MediaUploader.vue';
import {
  chatListTitle,
  deleteChatMessage,
  editChatMessage,
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
const ws = useWs();
const upload = useMediaUpload('chat');

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
const showJumpDown = ref(false);
const typingPeer = ref(false);
let typingClearTimer: ReturnType<typeof setTimeout> | null = null;
let typingSendTimer: ReturnType<typeof setTimeout> | null = null;
let wsUnsub: (() => void) | null = null;

const replyTo = ref<ChatMessage | null>(null);
const editingId = ref<string | null>(null);

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

type TimelineItem =
  | { type: 'day'; key: string; label: string }
  | { type: 'msg'; key: string; msg: ChatMessage };

const timeline = computed((): TimelineItem[] => {
  const items: TimelineItem[] = [];
  let lastDay = '';
  for (const msg of messages.value) {
    const dayKey = new Date(msg.createdAt).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (dayKey !== lastDay) {
      items.push({ type: 'day', key: `day-${dayKey}`, label: dayKey });
      lastDay = dayKey;
    }
    items.push({ type: 'msg', key: msg.id, msg });
  }
  return items;
});

watch(chatId, (id) => void load(id), { immediate: true });

onBeforeUnmount(() => {
  if (mentionTimer) clearTimeout(mentionTimer);
  if (typingClearTimer) clearTimeout(typingClearTimer);
  if (typingSendTimer) clearTimeout(typingSendTimer);
  wsUnsub?.();
  wsUnsub = null;
});

function applyWsEvent(ev: {
  event: string;
  payload: Record<string, unknown>;
}) {
  const p = ev.payload;
  if (ev.event === 'message.new') {
    const id = String(p.messageId ?? '');
    if (!id || messages.value.some((m) => m.id === id)) return;
    if (p.authorId === session.userId) {
      // REST optimistic path already added; ignore echo
      return;
    }
    messages.value.push({
      id,
      chatId: chatId.value,
      authorId: String(p.authorId ?? ''),
      body: String(p.body ?? ''),
      mentions: (p.mentions as ChatMessage['mentions']) ?? [],
      createdAt: String(p.createdAt ?? new Date().toISOString()),
      editedAt: null,
      deletedAt: null,
      status: null,
      replyToMessageId: (p.replyToMessageId as string | null) ?? null,
      replyTo: (p.replyTo as ChatMessage['replyTo']) ?? null,
      attachments: (p.attachments as ChatMessage['attachments']) ?? [],
    });
    typingPeer.value = false;
    void markChatRead(chatId.value, id);
    void chatsStore.refreshUnread();
    void nextTick().then(() => {
      if (!showJumpDown.value) scrollToBottom();
    });
    return;
  }
  if (ev.event === 'message.edited') {
    const id = String(p.messageId ?? '');
    const idx = messages.value.findIndex((m) => m.id === id);
    if (idx < 0) return;
    const cur = messages.value[idx]!;
    messages.value[idx] = {
      ...cur,
      body: String(p.body ?? cur.body),
      mentions: (p.mentions as ChatMessage['mentions']) ?? cur.mentions,
      editedAt: String(p.editedAt ?? new Date().toISOString()),
    };
    return;
  }
  if (ev.event === 'message.deleted') {
    const id = String(p.messageId ?? '');
    const idx = messages.value.findIndex((m) => m.id === id);
    if (idx < 0) return;
    const cur = messages.value[idx]!;
    messages.value[idx] = {
      ...cur,
      body: '',
      mentions: [],
      deletedAt: String(p.deletedAt ?? new Date().toISOString()),
    };
    return;
  }
  if (ev.event === 'message.read') {
    const readerId = String(p.userId ?? '');
    if (!readerId || readerId === session.userId) return;
    const at = p.lastReadAt ? new Date(String(p.lastReadAt)).getTime() : 0;
    messages.value = messages.value.map((m) => {
      if (m.authorId !== session.userId || m.deletedAt) return m;
      if (new Date(m.createdAt).getTime() <= at) {
        return { ...m, status: 'READ' as const };
      }
      return m;
    });
    return;
  }
  if (ev.event === 'typing') {
    const uid = String(p.userId ?? '');
    if (!uid || uid === session.userId) return;
    typingPeer.value = true;
    if (typingClearTimer) clearTimeout(typingClearTimer);
    const exp = p.expiresAt ? new Date(String(p.expiresAt)).getTime() : Date.now() + 5000;
    typingClearTimer = setTimeout(() => {
      typingPeer.value = false;
    }, Math.max(500, exp - Date.now()));
  }
}

async function bindWs(id: string) {
  wsUnsub?.();
  wsUnsub = null;
  typingPeer.value = false;
  try {
    wsUnsub = await ws.subscribe(`chat:${id}`, (ev) => applyWsEvent(ev));
  } catch {
    /* REST-only fallback */
  }
}

async function load(id: string) {
  loading.value = true;
  error.value = null;
  chat.value = null;
  messages.value = [];
  replyTo.value = null;
  editingId.value = null;
  try {
    const [chatRow, msgRows] = await Promise.all([
      getChat(id),
      listChatMessages(id),
    ]);
    chat.value = chatRow;
    messages.value = msgRows;
    const last = [...msgRows].reverse().find((m) => !m.deletedAt) ?? msgRows[msgRows.length - 1];
    await markChatRead(id, last?.id);
    void chatsStore.refreshUnread();
    await bindWs(id);
    await nextTick();
    scrollToBottom();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось открыть чат';
  } finally {
    loading.value = false;
  }
}

function onScroll() {
  const el = listEl.value;
  if (!el) return;
  const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
  showJumpDown.value = dist > 120;
}

function scrollToBottom() {
  const el = listEl.value;
  if (el) el.scrollTop = el.scrollHeight;
  showJumpDown.value = false;
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

function startReply(msg: ChatMessage) {
  if (msg.deletedAt) return;
  editingId.value = null;
  replyTo.value = msg;
  composeEl.value?.focus();
}

function startEdit(msg: ChatMessage) {
  if (!isMine(msg) || msg.deletedAt) return;
  replyTo.value = null;
  editingId.value = msg.id;
  body.value = msg.body;
  composeEl.value?.focus();
}

function cancelComposeMode() {
  replyTo.value = null;
  editingId.value = null;
}

async function removeMessage(msg: ChatMessage) {
  if (!isMine(msg) || msg.deletedAt) return;
  if (!window.confirm('Удалить сообщение?')) return;
  try {
    const updated = await deleteChatMessage(chatId.value, msg.id);
    const idx = messages.value.findIndex((m) => m.id === msg.id);
    if (idx >= 0) messages.value[idx] = updated;
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Не удалось удалить');
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
  } else {
    mentionStart.value = caret - (match[2]?.length ?? 0) - 1;
    mentionQuery.value = match[2] ?? '';
    mentionOpen.value = true;
    if (mentionTimer) clearTimeout(mentionTimer);
    mentionTimer = setTimeout(() => {
      void runMentionSearch(mentionQuery.value);
    }, 180);
  }

  if (!editingId.value && body.value.trim()) {
    if (typingSendTimer) clearTimeout(typingSendTimer);
    typingSendTimer = setTimeout(() => {
      ws.sendTyping(`chat:${chatId.value}`);
    }, 400);
  }
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
  const attachmentIds = upload.readyAttachments.value
    .map((a) => a.id)
    .filter((id): id is string => Boolean(id));
  if (sending.value) return;
  if (!text && !attachmentIds.length) return;
  if (upload.items.value.some((i) => i.status === 'uploading' || i.status === 'queued')) {
    toast.message('Дождитесь окончания загрузки файлов');
    return;
  }

  if (editingId.value) {
    if (!text) return;
    sending.value = true;
    try {
      const updated = await editChatMessage(chatId.value, editingId.value, text);
      const idx = messages.value.findIndex((m) => m.id === editingId.value);
      if (idx >= 0) messages.value[idx] = updated;
      body.value = '';
      cancelComposeMode();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось изменить');
    } finally {
      sending.value = false;
    }
    return;
  }

  if (text.includes('@') && needsUsernameBanner.value) {
    toast.message('Задайте @ник в Account Center, чтобы упоминания работали для вас');
  }
  sending.value = true;
  const tempId = `tmp-${Date.now()}`;
  const replySnapshot = replyTo.value;
  const optimisticAttachments = upload.readyAttachments.value.map((a) => ({
    id: a.id ?? '',
    url: a.url,
    filename: a.filename,
    contentType: a.contentType,
    sizeBytes: a.sizeBytes,
  }));
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
    replyToMessageId: replySnapshot?.id ?? null,
    replyTo: replySnapshot
      ? {
          id: replySnapshot.id,
          authorId: replySnapshot.authorId,
          body: replySnapshot.body.slice(0, 200),
          deleted: Boolean(replySnapshot.deletedAt),
        }
      : null,
    attachments: optimisticAttachments,
  };
  messages.value.push(optimistic);
  body.value = '';
  upload.reset();
  closeMention();
  cancelComposeMode();
  await nextTick();
  scrollToBottom();

  try {
    const msg = await sendChatMessage(chatId.value, text, {
      replyToMessageId: replySnapshot?.id,
      attachmentIds,
    });
    const idx = messages.value.findIndex((m) => m.id === tempId);
    if (idx >= 0) messages.value[idx] = msg;
    else messages.value.push(msg);
    await markChatRead(chatId.value, msg.id);
    void chatsStore.refreshUnread();
    await nextTick();
    scrollToBottom();
  } catch (e) {
    messages.value = messages.value.filter((m) => m.id !== tempId);
    body.value = text;
    if (replySnapshot) replyTo.value = replySnapshot;
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
  return new Date(iso).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

type BodyPart =
  | { type: 'text'; text: string }
  | { type: 'mention'; text: string; userId: string; username: string };

function messageParts(msg: ChatMessage): BodyPart[] {
  if (msg.deletedAt) return [{ type: 'text', text: 'Сообщение удалено' }];
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
  <section class="relative flex min-h-[70dvh] flex-col gap-2">
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
      <div class="relative min-h-0 flex-1">
        <div
          ref="listEl"
          class="h-full space-y-1 overflow-y-auto rounded-lg border border-border bg-surface px-2 py-3"
          @scroll="onScroll"
        >
          <p
            v-if="!messages.length"
            class="px-2 text-sm text-text-muted"
          >
            Пока нет сообщений. Напишите первое.
          </p>
          <template
            v-for="item in timeline"
            :key="item.key"
          >
            <div
              v-if="item.type === 'day'"
              class="sticky top-0 z-[1] flex justify-center py-2"
            >
              <span class="rounded-full bg-bg/90 px-2.5 py-0.5 text-[11px] text-text-muted backdrop-blur">
                {{ item.label }}
              </span>
            </div>
            <div
              v-else
              class="group flex"
              :class="isMine(item.msg) ? 'justify-end' : 'justify-start'"
            >
              <div
                class="max-w-[85%] rounded-2xl px-2.5 py-1.5 text-sm"
                :class="[
                  isMine(item.msg)
                    ? 'bg-primary text-primary-fg'
                    : 'bg-bg text-text',
                  item.msg.deletedAt ? 'opacity-70 italic' : '',
                ]"
              >
                <div
                  v-if="item.msg.replyTo"
                  class="mb-1 rounded-md border-l-2 border-current/40 bg-black/10 px-2 py-1 text-[11px] opacity-90"
                >
                  <p class="truncate font-medium">
                    {{ item.msg.replyTo.deleted ? 'Удалённое сообщение' : item.msg.replyTo.body }}
                  </p>
                </div>
                <AttachmentList
                  v-if="item.msg.attachments?.length && !item.msg.deletedAt"
                  :attachments="item.msg.attachments"
                  variant="compact"
                  class="mb-1"
                />
                <p
                  v-if="item.msg.body || item.msg.deletedAt"
                  class="whitespace-pre-wrap break-words"
                >
                  <template
                    v-for="(part, idx) in messageParts(item.msg)"
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
                <div class="mt-0.5 flex items-center justify-end gap-1.5 text-[10px] opacity-70">
                  <span
                    v-if="item.msg.editedAt && !item.msg.deletedAt"
                    class="mr-auto opacity-80"
                  >изм.</span>
                  <time :datetime="item.msg.createdAt">
                    {{ formatTime(item.msg.createdAt) }}
                  </time>
                  <span
                    v-if="showStatus && isMine(item.msg) && item.msg.status && !item.msg.deletedAt"
                    class="tabular-nums"
                    :title="messageStatusLabel(item.msg.status)"
                    :aria-label="messageStatusLabel(item.msg.status)"
                  >
                    {{ statusGlyph(item.msg.status) }}
                  </span>
                </div>
                <div
                  v-if="!item.msg.deletedAt"
                  class="mt-1 hidden gap-2 text-[11px] opacity-80 group-hover:flex"
                  :class="isMine(item.msg) ? 'justify-end' : 'justify-start'"
                >
                  <button
                    type="button"
                    class="hover:underline"
                    @click="startReply(item.msg)"
                  >
                    Ответить
                  </button>
                  <button
                    v-if="isMine(item.msg)"
                    type="button"
                    class="hover:underline"
                    @click="startEdit(item.msg)"
                  >
                    Изменить
                  </button>
                  <button
                    v-if="isMine(item.msg)"
                    type="button"
                    class="hover:underline"
                    @click="removeMessage(item.msg)"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          </template>
        </div>

        <button
          v-if="showJumpDown"
          type="button"
          class="absolute bottom-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-text shadow-md"
          title="Вниз"
          @click="scrollToBottom"
        >
          <UiIcon
            name="chevronDown"
            :size="18"
            label="Вниз"
          />
        </button>
      </div>

      <div class="relative">
        <p
          v-if="typingPeer"
          class="mb-1 px-1 text-xs text-text-muted"
        >
          печатает…
        </p>
        <div
          v-if="replyTo || editingId"
          class="mb-1 flex items-center gap-2 rounded-md border border-border bg-bg px-2 py-1.5 text-xs text-text-muted"
        >
          <span class="min-w-0 flex-1 truncate">
            <template v-if="editingId">Редактирование</template>
            <template v-else>Ответ: {{ replyTo?.body }}</template>
          </span>
          <button
            type="button"
            class="shrink-0 hover:text-text"
            @click="cancelComposeMode"
          >
            ✕
          </button>
        </div>

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
          class="flex flex-col gap-2"
          @submit.prevent="send"
        >
          <MediaUploader
            v-if="!editingId"
            class="text-text"
            :items="upload.items.value"
            :accept="upload.limits.value?.accept ?? 'image/*,.pdf'"
            :can-add-more="upload.canAddMore.value"
            :hint="upload.limits.value ? `До ${upload.limits.value.countMax} файлов, ≤ ${upload.limits.value.sizeMaxMb} MB` : undefined"
            @select="upload.addFiles($event)"
            @remove="upload.removeItem"
          />
          <p
            v-if="upload.globalError.value"
            class="text-xs text-danger"
          >
            {{ upload.globalError.value }}
          </p>
          <div class="flex gap-2">
          <label class="sr-only" for="chat-compose">Сообщение</label>
          <textarea
            id="chat-compose"
            ref="composeEl"
            v-model="body"
            rows="2"
            class="min-h-11 flex-1 resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
            :placeholder="editingId ? 'Изменить сообщение…' : 'Сообщение… (@ник)'"
            @input="onComposeInput"
            @keydown.enter.exact.prevent="send"
            @keydown.escape="closeMention(); cancelComposeMode()"
          />
          <UiButton
            intent="primary"
            type="submit"
            :disabled="Boolean(sending || (editingId ? !body.trim() : !body.trim() && !upload.readyAttachments.value.length))"
          >
            {{ editingId ? 'Сохранить' : 'Отправить' }}
          </UiButton>
          </div>
        </form>
      </div>
    </template>
  </section>
</template>
