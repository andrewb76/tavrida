<script setup lang="ts">
import { useWs } from '@/composables/useWs';
import { useMediaUpload } from '@/composables/useMediaUpload';
import { logtoAccountUsernameUrl } from '@/config/logto';
import AttachmentList from '@/components/media/AttachmentList.vue';
import {
  authorHue,
  chatListTitle,
  deleteChatMessage,
  editChatMessage,
  getChat,
  listChatMessages,
  markChatRead,
  messageAuthorLabel,
  messageStatusLabel,
  searchChatUsers,
  sendChatMessage,
  spawnGroupFromDirect,
  type ChatDto,
  type ChatMessage,
  type ChatMessageAuthor,
  type ChatUserHit,
  type MessageDeliveryStatus,
} from '@/services/chats';
import { useChatsStore } from '@/stores/chats';
import { useSessionStore } from '@/stores/session';
import { UiIcon } from '@tavrida/ui';
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
const bottomAnchor = ref<HTMLElement | null>(null);
const composeEl = ref<HTMLTextAreaElement | null>(null);
const attachInput = ref<HTMLInputElement | null>(null);
const showJumpDown = ref(false);
/** Block history pagination until first scroll-to-bottom settles. */
const readyForHistory = ref(false);
const typingPeer = ref(false);
const nextCursor = ref<string | null>(null);
const historyCapReached = ref(false);
const loadingOlder = ref(false);
let typingClearTimer: ReturnType<typeof setTimeout> | null = null;
let typingSendTimer: ReturnType<typeof setTimeout> | null = null;
let wsUnsub: (() => void) | null = null;
let pressTimer: ReturnType<typeof setTimeout> | null = null;
let pressMoved = false;

const replyTo = ref<ChatMessage | null>(null);
const editingId = ref<string | null>(null);
const actionMsg = ref<ChatMessage | null>(null);
const headerMenuOpen = ref(false);

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

/** Telegram-like: names only in multi-party rooms, and only on others' bubbles. */
const showAuthorNames = computed(
  () => chat.value?.kind === 'GROUP' || chat.value?.kind === 'TOPIC',
);

const usernameAccountUrl = computed(() => logtoAccountUsernameUrl());

const needsUsernameBanner = computed(
  () => Boolean(session.logtoEnabled && session.isAuthenticated && !session.username),
);

const canSend = computed(() => {
  if (sending.value) return false;
  if (editingId.value) return Boolean(body.value.trim());
  if (upload.items.value.some((i) => i.status === 'uploading' || i.status === 'queued')) {
    return false;
  }
  return Boolean(body.value.trim() || upload.readyAttachments.value.length);
});

const subtitle = computed(() => {
  if (!chat.value) return '';
  if (typingPeer.value) return 'печатает…';
  if (chat.value.kind === 'TOPIC') return 'Чат темы';
  if (chat.value.kind === 'GROUP') return 'Группа';
  if (chat.value.self) return 'только вы';
  if (chat.value.peer?.username) return `@${chat.value.peer.username}`;
  return 'в сети недавно';
});

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
watch(body, () => void nextTick(autosizeCompose));

onBeforeUnmount(() => {
  if (mentionTimer) clearTimeout(mentionTimer);
  if (typingClearTimer) clearTimeout(typingClearTimer);
  if (typingSendTimer) clearTimeout(typingSendTimer);
  if (pressTimer) clearTimeout(pressTimer);
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
      return;
    }
    messages.value.push({
      id,
      chatId: chatId.value,
      authorId: String(p.authorId ?? ''),
      author: (p.author as ChatMessageAuthor | null | undefined) ?? null,
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
  nextCursor.value = null;
  historyCapReached.value = false;
  readyForHistory.value = false;
  replyTo.value = null;
  editingId.value = null;
  actionMsg.value = null;
  headerMenuOpen.value = false;
  try {
    const [chatRow, page] = await Promise.all([
      getChat(id),
      listChatMessages(id, { loaded: 0 }),
    ]);
    chat.value = chatRow;
    messages.value = page.data;
    nextCursor.value = page.nextCursor;
    historyCapReached.value = page.historyCapReached;
    const last = [...page.data].reverse().find((m) => !m.deletedAt) ?? page.data[page.data.length - 1];
    await markChatRead(id, last?.id);
    void chatsStore.refreshUnread();
    await bindWs(id);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось открыть чат';
  } finally {
    loading.value = false;
  }
  if (!error.value) {
    await settleScrollToBottom();
    readyForHistory.value = true;
  }
}

async function loadOlder() {
  if (
    !readyForHistory.value ||
    loadingOlder.value ||
    loading.value ||
    !nextCursor.value ||
    historyCapReached.value
  ) {
    return;
  }
  const el = listEl.value;
  const prevHeight = el?.scrollHeight ?? 0;
  const prevTop = el?.scrollTop ?? 0;
  loadingOlder.value = true;
  try {
    const page = await listChatMessages(chatId.value, {
      cursor: nextCursor.value,
      loaded: messages.value.length,
    });
    if (!page.data.length) {
      nextCursor.value = null;
      historyCapReached.value = page.historyCapReached || !page.nextCursor;
      return;
    }
    const existing = new Set(messages.value.map((m) => m.id));
    const older = page.data.filter((m) => !existing.has(m.id));
    messages.value = [...older, ...messages.value];
    nextCursor.value = page.nextCursor;
    historyCapReached.value = page.historyCapReached;
    await nextTick();
    if (el) {
      el.scrollTop = prevTop + (el.scrollHeight - prevHeight);
    }
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Не удалось подгрузить историю');
  } finally {
    loadingOlder.value = false;
  }
}

function onScroll() {
  const el = listEl.value;
  if (!el) return;
  const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
  showJumpDown.value = dist > 120;
  if (el.scrollTop < 80) {
    void loadOlder();
  }
}

function scrollToBottom() {
  const el = listEl.value;
  if (el) {
    el.scrollTop = el.scrollHeight;
  }
  bottomAnchor.value?.scrollIntoView({ block: 'end', inline: 'nearest' });
  showJumpDown.value = false;
}

async function settleScrollToBottom() {
  for (let i = 0; i < 6; i += 1) {
    await nextTick();
    scrollToBottom();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
}

function autosizeCompose() {
  const el = composeEl.value;
  if (!el) return;
  el.style.height = '0px';
  el.style.height = `${Math.min(Math.max(el.scrollHeight, 40), 128)}px`;
}

async function spawnGroup() {
  headerMenuOpen.value = false;
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

function openActions(msg: ChatMessage) {
  if (msg.deletedAt) return;
  actionMsg.value = msg;
}

function closeActions() {
  actionMsg.value = null;
}

function onMsgPointerDown(msg: ChatMessage, ev: PointerEvent) {
  if (msg.deletedAt || ev.pointerType === 'mouse' && ev.button !== 0) return;
  pressMoved = false;
  if (pressTimer) clearTimeout(pressTimer);
  pressTimer = setTimeout(() => {
    if (!pressMoved) {
      openActions(msg);
      if (navigator.vibrate) navigator.vibrate(12);
    }
  }, 420);
}

function onMsgPointerMove() {
  pressMoved = true;
  if (pressTimer) {
    clearTimeout(pressTimer);
    pressTimer = null;
  }
}

function onMsgPointerUp() {
  if (pressTimer) {
    clearTimeout(pressTimer);
    pressTimer = null;
  }
}

function onMsgContextMenu(msg: ChatMessage, ev: MouseEvent) {
  ev.preventDefault();
  openActions(msg);
}

function startReply(msg: ChatMessage) {
  if (msg.deletedAt) return;
  editingId.value = null;
  replyTo.value = msg;
  actionMsg.value = null;
  composeEl.value?.focus();
}

function startEdit(msg: ChatMessage) {
  if (!isMine(msg) || msg.deletedAt) return;
  replyTo.value = null;
  editingId.value = msg.id;
  body.value = msg.body;
  actionMsg.value = null;
  void nextTick(() => {
    autosizeCompose();
    composeEl.value?.focus();
  });
}

function cancelComposeMode() {
  replyTo.value = null;
  editingId.value = null;
  void nextTick(autosizeCompose);
}

async function removeMessage(msg: ChatMessage) {
  if (!isMine(msg) || msg.deletedAt) return;
  actionMsg.value = null;
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
  autosizeCompose();
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
    autosizeCompose();
  });
}

function onAttachPick(ev: Event) {
  const input = ev.target as HTMLInputElement;
  if (input.files?.length) upload.addFiles(input.files);
  input.value = '';
}

async function send() {
  const text = body.value.trim();
  const attachmentIds = upload.readyAttachments.value
    .map((a) => a.id)
    .filter((id): id is string => Boolean(id));
  if (!canSend.value) return;
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
    author: {
      userId: session.userId ?? '',
      displayName: session.displayName || null,
      username: session.username ?? null,
      avatarUrl: session.avatarUrl ?? null,
    },
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
          authorDisplayName: messageAuthorLabel(replySnapshot),
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
  autosizeCompose();
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

function shouldShowAuthor(msg: ChatMessage) {
  return showAuthorNames.value && !isMine(msg) && !msg.deletedAt;
}

function statusIcon(status: MessageDeliveryStatus | null | undefined): 'check' | 'checkCheck' | null {
  if (status === 'DELIVERED') return 'check';
  if (status === 'READ') return 'checkCheck';
  return null;
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
  <section class="chat-room">
    <header class="chat-room__header">
      <RouterLink
        to="/chats"
        class="chat-room__icon-btn"
        title="К списку"
      >
        <UiIcon
          name="chevronLeft"
          :size="22"
          label="Назад"
        />
      </RouterLink>
      <div class="chat-room__title-wrap">
        <h1 class="chat-room__title">
          {{ title }}
        </h1>
        <p class="chat-room__subtitle">
          <template v-if="chat?.kind === 'TOPIC' && chat.contextId">
            <RouterLink
              :to="{ name: 'forum-topic', params: { id: chat.contextId } }"
              class="hover:text-primary"
            >
              К теме форума
            </RouterLink>
          </template>
          <template v-else>
            {{ subtitle }}
          </template>
        </p>
      </div>
      <div class="relative">
        <button
          v-if="canSpawnGroup"
          type="button"
          class="chat-room__icon-btn"
          title="Ещё"
          @click="headerMenuOpen = !headerMenuOpen"
        >
          <UiIcon
            name="more"
            :size="20"
            label="Ещё"
          />
        </button>
        <div
          v-if="headerMenuOpen"
          class="chat-room__menu"
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            :disabled="spawning"
            @click="spawnGroup"
          >
            {{ spawning ? 'Создание…' : 'Создать группу' }}
          </button>
        </div>
      </div>
    </header>

    <p
      v-if="needsUsernameBanner"
      class="chat-room__banner"
    >
      Задайте
      <span class="text-text">@ник</span>
      для упоминаний.
      <a
        v-if="usernameAccountUrl"
        :href="usernameAccountUrl"
        class="text-primary"
      >Изменить</a>
    </p>

    <p
      v-if="loading"
      class="chat-room__state"
    >
      Загрузка…
    </p>
    <p
      v-else-if="error"
      class="chat-room__state chat-room__state--error"
    >
      {{ error }}
    </p>

    <template v-else>
      <div class="chat-room__feed-wrap">
        <div
          ref="listEl"
          class="chat-room__feed"
          @scroll="onScroll"
        >
          <div class="chat-room__feed-inner">
          <p
            v-if="loadingOlder"
            class="chat-room__hint"
          >
            Загрузка…
          </p>
          <p
            v-else-if="historyCapReached && messages.length"
            class="chat-room__hint"
          >
            Достигнут лимит истории тарифа
          </p>
          <p
            v-if="!messages.length"
            class="chat-room__hint"
          >
            Пока нет сообщений. Напишите первое.
          </p>
          <template
            v-for="item in timeline"
            :key="item.key"
          >
            <div
              v-if="item.type === 'day'"
              class="chat-room__day"
            >
              <span>{{ item.label }}</span>
            </div>
            <div
              v-else
              class="chat-room__row"
              :class="isMine(item.msg) ? 'chat-room__row--mine' : 'chat-room__row--peer'"
            >
              <div
                class="chat-room__msg"
                :class="isMine(item.msg) ? 'chat-room__msg--mine' : 'chat-room__msg--peer'"
              >
                <button
                  v-if="!item.msg.deletedAt"
                  type="button"
                  class="chat-room__msg-menu"
                  title="Действия"
                  @click.stop="openActions(item.msg)"
                >
                  <UiIcon
                    name="more"
                    :size="18"
                    label="Действия"
                  />
                </button>
                <div
                  class="chat-bubble"
                  :class="[
                    isMine(item.msg) ? 'chat-bubble--mine' : 'chat-bubble--peer',
                    item.msg.deletedAt ? 'chat-bubble--deleted' : '',
                  ]"
                  @pointerdown="onMsgPointerDown(item.msg, $event)"
                  @pointermove="onMsgPointerMove"
                  @pointerup="onMsgPointerUp"
                  @pointercancel="onMsgPointerUp"
                  @contextmenu="onMsgContextMenu(item.msg, $event)"
                >
                  <div
                    v-if="item.msg.replyTo"
                    class="chat-bubble__reply"
                  >
                    <p
                      v-if="item.msg.replyTo.authorDisplayName"
                      class="chat-bubble__reply-author"
                    >
                      {{ item.msg.replyTo.authorDisplayName }}
                    </p>
                    <p class="truncate">
                      {{ item.msg.replyTo.deleted ? 'Удалённое сообщение' : item.msg.replyTo.body }}
                    </p>
                  </div>
                  <p
                    v-if="shouldShowAuthor(item.msg)"
                    class="chat-bubble__author"
                    :style="{ '--author-hue': String(authorHue(item.msg.authorId)) }"
                  >
                    <RouterLink
                      :to="{ name: 'profile-user', params: { userId: item.msg.authorId } }"
                      class="hover:underline"
                      @click.stop
                    >
                      {{ messageAuthorLabel(item.msg) }}
                    </RouterLink>
                  </p>
                  <AttachmentList
                    v-if="item.msg.attachments?.length && !item.msg.deletedAt"
                    :attachments="item.msg.attachments"
                    variant="compact"
                    class="mb-1"
                  />
                  <p
                    v-if="item.msg.body || item.msg.deletedAt"
                    class="chat-bubble__text"
                  >
                    <template
                      v-for="(part, idx) in messageParts(item.msg)"
                      :key="idx"
                    >
                      <RouterLink
                        v-if="part.type === 'mention'"
                        :to="{ name: 'profile-user', params: { userId: part.userId } }"
                        class="chat-bubble__mention"
                        @click.stop
                      >
                        {{ part.text }}
                      </RouterLink>
                      <template v-else>{{ part.text }}</template>
                    </template>
                    <span class="chat-bubble__meta">
                      <span
                        v-if="item.msg.editedAt && !item.msg.deletedAt"
                        class="chat-bubble__edited"
                      >изм.</span>
                      <time :datetime="item.msg.createdAt">
                        {{ formatTime(item.msg.createdAt) }}
                      </time>
                      <span
                        v-if="showStatus && isMine(item.msg) && !item.msg.deletedAt"
                        class="chat-bubble__status"
                        :class="{ 'chat-bubble__status--read': item.msg.status === 'READ' }"
                        :title="messageStatusLabel(item.msg.status)"
                        :aria-label="messageStatusLabel(item.msg.status)"
                      >
                        <template v-if="item.msg.status === 'SENDING'">…</template>
                        <UiIcon
                          v-else-if="statusIcon(item.msg.status)"
                          :name="statusIcon(item.msg.status)!"
                          :size="14"
                        />
                      </span>
                    </span>
                  </p>
                  <p
                    v-else
                    class="chat-bubble__meta chat-bubble__meta--solo"
                  >
                    <time :datetime="item.msg.createdAt">
                      {{ formatTime(item.msg.createdAt) }}
                    </time>
                  </p>
                </div>
              </div>
            </div>
          </template>
          <div
            ref="bottomAnchor"
            class="chat-room__bottom-anchor"
            aria-hidden="true"
          />
          </div>
        </div>

        <button
          v-if="showJumpDown"
          type="button"
          class="chat-room__jump"
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

      <footer class="chat-room__composer">
        <div
          v-if="replyTo || editingId"
          class="chat-room__compose-mode"
        >
          <div class="min-w-0 flex-1">
            <p class="font-medium text-primary">
              {{ editingId ? 'Редактирование' : 'Ответ' }}
            </p>
            <p class="truncate text-text-muted">
              {{ editingId ? body : replyTo?.body }}
            </p>
          </div>
          <button
            type="button"
            class="chat-room__icon-btn"
            @click="cancelComposeMode"
          >
            <UiIcon
              name="close"
              :size="18"
              label="Отмена"
            />
          </button>
        </div>

        <ul
          v-if="upload.items.value.length && !editingId"
          class="chat-room__attach-preview"
        >
          <li
            v-for="item in upload.items.value"
            :key="item.id"
            class="chat-room__attach-chip"
          >
            <img
              v-if="item.previewUrl"
              :src="item.previewUrl"
              alt=""
            >
            <span v-else>{{ item.file.name }}</span>
            <button
              type="button"
              @click="upload.removeItem(item.id)"
            >
              ✕
            </button>
          </li>
        </ul>
        <p
          v-if="upload.globalError.value"
          class="px-1 text-xs text-error"
        >
          {{ upload.globalError.value }}
        </p>

        <ul
          v-if="mentionOpen && mentionHits.length"
          class="chat-room__mentions"
          role="listbox"
        >
          <li
            v-for="hit in mentionHits"
            :key="hit.userId"
          >
            <button
              type="button"
              @mousedown.prevent="insertMention(hit)"
            >
              <span class="font-medium">@{{ hit.username }}</span>
              <span
                v-if="hit.displayName"
                class="truncate text-text-muted"
              >{{ hit.displayName }}</span>
            </button>
          </li>
        </ul>

        <form
          class="chat-room__compose-row"
          @submit.prevent="send"
        >
          <input
            ref="attachInput"
            type="file"
            class="sr-only"
            :accept="upload.limits.value?.accept ?? 'image/*,.pdf'"
            multiple
            @change="onAttachPick"
          >
          <button
            v-if="!editingId"
            type="button"
            class="chat-room__icon-btn"
            :disabled="!upload.canAddMore.value"
            title="Вложение"
            @click="attachInput?.click()"
          >
            <UiIcon
              name="paperclip"
              :size="22"
              label="Вложение"
            />
          </button>
          <label
            class="sr-only"
            for="chat-compose"
          >Сообщение</label>
          <textarea
            id="chat-compose"
            ref="composeEl"
            v-model="body"
            rows="1"
            class="chat-room__input"
            :placeholder="editingId ? 'Изменить…' : 'Сообщение'"
            enterkeyhint="send"
            @input="onComposeInput"
            @keydown.enter.exact.prevent="send"
            @keydown.escape="closeMention(); cancelComposeMode()"
          />
          <button
            type="submit"
            class="chat-room__send"
            :disabled="!canSend"
            :title="editingId ? 'Сохранить' : 'Отправить'"
          >
            <UiIcon
              :name="editingId ? 'check' : 'send'"
              :size="18"
              :label="editingId ? 'Сохранить' : 'Отправить'"
            />
          </button>
        </form>
      </footer>
    </template>

    <Teleport to="body">
      <div
        v-if="actionMsg"
        class="chat-sheet"
        @click.self="closeActions"
      >
        <div
          class="chat-sheet__panel"
          role="dialog"
          aria-label="Действия с сообщением"
        >
          <p class="chat-sheet__preview">
            {{ actionMsg.deletedAt ? 'Сообщение удалено' : actionMsg.body || 'Вложение' }}
          </p>
          <button
            type="button"
            class="chat-sheet__action"
            @click="startReply(actionMsg)"
          >
            <span class="chat-sheet__icon" aria-hidden="true">
              <UiIcon
                name="reply"
                :size="20"
              />
            </span>
            Ответить
          </button>
          <button
            v-if="isMine(actionMsg)"
            type="button"
            class="chat-sheet__action"
            @click="startEdit(actionMsg)"
          >
            <span class="chat-sheet__icon" aria-hidden="true">
              <UiIcon
                name="edit"
                :size="20"
              />
            </span>
            Изменить
          </button>
          <button
            v-if="isMine(actionMsg)"
            type="button"
            class="chat-sheet__action chat-sheet__danger"
            @click="removeMessage(actionMsg)"
          >
            <span class="chat-sheet__icon" aria-hidden="true">
              <UiIcon
                name="trash"
                :size="20"
              />
            </span>
            Удалить
          </button>
          <button
            type="button"
            class="chat-sheet__cancel"
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
.chat-room {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1 1 auto;
  height: 100%;
  background:
    radial-gradient(circle at 20% 10%, color-mix(in srgb, var(--token-primary) 8%, transparent), transparent 42%),
    radial-gradient(circle at 80% 90%, color-mix(in srgb, var(--token-accent) 10%, transparent), transparent 40%),
    color-mix(in srgb, var(--token-bg) 88%, var(--token-surface));
}

@media (min-width: 640px) {
  .chat-room {
    min-height: min(70dvh, 720px);
    max-height: calc(100dvh - 8rem);
    border: 1px solid var(--token-border);
    border-radius: var(--token-radius-lg);
    overflow: hidden;
  }
}

@media (max-width: 639px) {
  .chat-room {
    height: 100dvh;
    max-height: 100dvh;
  }
}

.chat-room__header {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.5rem;
  padding-top: calc(0.5rem + env(safe-area-inset-top, 0px));
  border-bottom: 1px solid var(--token-border);
  background: color-mix(in srgb, var(--token-surface) 92%, transparent);
  backdrop-filter: blur(10px);
  flex-shrink: 0;
}

.chat-room__title-wrap {
  min-width: 0;
  flex: 1;
}

.chat-room__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.25;
  color: var(--token-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-room__subtitle {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.2;
  color: var(--token-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-room__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 999px;
  color: var(--token-text-muted);
  flex-shrink: 0;
}

.chat-room__icon-btn:hover,
.chat-room__icon-btn:focus-visible {
  background: var(--token-bg);
  color: var(--token-text);
  outline: none;
}

.chat-room__icon-btn:disabled {
  opacity: 0.4;
}

.chat-room__menu {
  position: absolute;
  right: 0;
  top: 100%;
  z-index: 20;
  min-width: 11rem;
  border: 1px solid var(--token-border);
  border-radius: var(--token-radius-md);
  background: var(--token-surface);
  box-shadow: var(--token-shadow-card);
  padding: 0.25rem;
}

.chat-room__menu button {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.75rem 0.75rem;
  border-radius: var(--token-radius-sm);
  font-size: 0.875rem;
}

.chat-room__menu button:hover {
  background: var(--token-bg);
}

.chat-room__banner {
  margin: 0;
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  color: var(--token-text-muted);
  background: var(--token-bg);
  border-bottom: 1px solid var(--token-border);
}

.chat-room__state {
  padding: 1.5rem;
  text-align: center;
  color: var(--token-text-muted);
  font-size: 0.875rem;
}

.chat-room__state--error {
  color: var(--token-error);
}

.chat-room__feed-wrap {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
}

.chat-room__feed {
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  padding: 0.5rem 0.625rem 0.75rem;
  display: flex;
  flex-direction: column;
}

.chat-room__feed-inner {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-height: min-content;
}

.chat-room__bottom-anchor {
  width: 100%;
  height: 1px;
  flex-shrink: 0;
  pointer-events: none;
}

.chat-room__hint {
  margin: 0;
  padding: 0.5rem;
  text-align: center;
  font-size: 0.75rem;
  color: var(--token-text-muted);
}

.chat-room__day {
  display: flex;
  justify-content: center;
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 0.35rem 0;
}

.chat-room__day span {
  border-radius: 999px;
  background: color-mix(in srgb, var(--token-surface) 85%, transparent);
  backdrop-filter: blur(8px);
  padding: 0.2rem 0.65rem;
  font-size: 0.6875rem;
  color: var(--token-text-muted);
}

.chat-room__row {
  display: flex;
}

.chat-room__row--mine {
  justify-content: flex-end;
}

.chat-room__row--peer {
  justify-content: flex-start;
}

.chat-room__msg {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  max-width: min(92%, 30rem);
}

.chat-room__msg--mine {
  flex-direction: row;
}

.chat-room__msg--peer {
  flex-direction: row-reverse;
}

.chat-room__msg-menu {
  display: inline-flex;
  flex-shrink: 0;
  width: 2.25rem;
  height: 2.25rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: var(--token-text-muted);
}

.chat-room__msg-menu:hover,
.chat-room__msg-menu:focus-visible {
  background: color-mix(in srgb, var(--token-surface) 80%, transparent);
  color: var(--token-text);
  outline: none;
}

.chat-bubble {
  position: relative;
  max-width: 100%;
  min-width: 0;
  flex: 1 1 auto;
  padding: 0.4rem 0.55rem 0.3rem;
  font-size: 0.9375rem;
  line-height: 1.35;
  touch-action: pan-y;
}

.chat-bubble--mine {
  border-radius: 1rem 1rem 0.35rem 1rem;
  background: color-mix(in srgb, var(--token-primary) 88%, #0b2a3d);
  color: var(--token-primary-fg, #fff);
}

html[data-theme='dark'] .chat-bubble--mine {
  background: color-mix(in srgb, var(--token-primary) 35%, var(--token-surface));
  color: var(--token-text);
}

.chat-bubble--peer {
  border-radius: 1rem 1rem 1rem 0.35rem;
  background: var(--token-surface);
  color: var(--token-text);
  box-shadow: 0 1px 1px rgb(0 0 0 / 0.04);
}

.chat-bubble--deleted {
  opacity: 0.7;
  font-style: italic;
}

.chat-bubble__reply {
  margin-bottom: 0.25rem;
  padding: 0.25rem 0.45rem;
  border-left: 2px solid currentColor;
  border-radius: 0.35rem;
  background: rgb(0 0 0 / 0.08);
  font-size: 0.75rem;
  opacity: 0.92;
}

.chat-bubble__reply-author {
  margin: 0 0 0.1rem;
  font-weight: 600;
  font-size: 0.7rem;
}

.chat-bubble__author {
  margin: 0 0 0.15rem;
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.2;
  color: hsl(var(--author-hue, 200) 55% 38%);
}

html[data-theme='dark'] .chat-bubble__author {
  color: hsl(var(--author-hue, 200) 60% 68%);
}

.chat-bubble__text {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.chat-bubble__mention {
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.chat-bubble__meta {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  float: right;
  margin: 0.35rem 0 0 0.5rem;
  font-size: 0.6875rem;
  line-height: 1;
  opacity: 0.72;
  white-space: nowrap;
}

.chat-bubble__meta--solo {
  float: none;
  justify-content: flex-end;
  width: 100%;
  margin-top: 0.15rem;
}

.chat-bubble__edited {
  margin-right: 0.15rem;
}

.chat-bubble__status {
  display: inline-flex;
  opacity: 0.85;
}

.chat-bubble__status--read {
  color: color-mix(in srgb, #7dd3fc 70%, currentColor);
  opacity: 1;
}

.chat-room__jump {
  position: absolute;
  right: 0.75rem;
  bottom: 0.75rem;
  display: inline-flex;
  width: 2.5rem;
  height: 2.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid var(--token-border);
  background: var(--token-surface);
  color: var(--token-text);
  box-shadow: var(--token-shadow-card);
}

.chat-room__composer {
  position: relative;
  flex-shrink: 0;
  border-top: 1px solid var(--token-border);
  background: color-mix(in srgb, var(--token-surface) 94%, transparent);
  backdrop-filter: blur(10px);
  padding: 0.4rem 0.4rem calc(0.4rem + env(safe-area-inset-bottom, 0px));
}

.chat-room__compose-mode {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0 0.35rem 0.35rem;
  padding: 0.4rem 0.5rem;
  border-left: 3px solid var(--token-primary);
  border-radius: 0 var(--token-radius-sm) var(--token-radius-sm) 0;
  background: var(--token-bg);
  font-size: 0.75rem;
}

.chat-room__attach-preview {
  display: flex;
  gap: 0.4rem;
  overflow-x: auto;
  list-style: none;
  margin: 0 0.35rem 0.35rem;
  padding: 0;
}

.chat-room__attach-chip {
  position: relative;
  flex-shrink: 0;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: var(--token-radius-sm);
  overflow: hidden;
  background: var(--token-bg);
  font-size: 0.625rem;
}

.chat-room__attach-chip img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chat-room__attach-chip button {
  position: absolute;
  top: 0.1rem;
  right: 0.1rem;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 999px;
  background: rgb(0 0 0 / 0.55);
  color: #fff;
  font-size: 0.625rem;
}

.chat-room__mentions {
  position: absolute;
  left: 0.5rem;
  right: 0.5rem;
  bottom: 100%;
  margin-bottom: 0.25rem;
  max-height: 10rem;
  overflow-y: auto;
  list-style: none;
  padding: 0.25rem;
  border: 1px solid var(--token-border);
  border-radius: var(--token-radius-md);
  background: var(--token-surface);
  box-shadow: var(--token-shadow-card);
  z-index: 10;
}

.chat-room__mentions button {
  display: flex;
  width: 100%;
  gap: 0.5rem;
  align-items: center;
  padding: 0.65rem 0.75rem;
  text-align: left;
  font-size: 0.875rem;
  border-radius: var(--token-radius-sm);
}

.chat-room__mentions button:hover {
  background: var(--token-bg);
}

.chat-room__compose-row {
  display: flex;
  align-items: flex-end;
  gap: 0.15rem;
}

.chat-room__input {
  flex: 1;
  min-height: 2.5rem;
  max-height: 8rem;
  resize: none;
  border: 1px solid var(--token-border);
  border-radius: 1.25rem;
  background: var(--token-bg);
  color: var(--token-text);
  padding: 0.65rem 0.9rem;
  font-size: 1rem;
  line-height: 1.3;
  field-sizing: content;
}

.chat-room__input:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--token-primary) 50%, var(--token-border));
}

.chat-room__send {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 999px;
  background: var(--token-primary);
  color: var(--token-primary-fg, #fff);
  flex-shrink: 0;
}

.chat-room__send:disabled {
  opacity: 0.4;
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

.chat-sheet__preview {
  margin: 0;
  padding: 0.85rem 1rem;
  font-size: 0.8125rem;
  color: var(--token-text-muted);
  border-bottom: 1px solid var(--token-border);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-sheet__action {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.95rem 1rem;
  font-size: 1rem;
  text-align: left;
  color: var(--token-text);
  min-height: 3.25rem;
}

.chat-sheet__icon {
  display: inline-flex;
  width: 2.25rem;
  height: 2.25rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--token-bg);
  color: var(--token-text);
}

.chat-sheet__action:active {
  background: var(--token-bg);
}

.chat-sheet__danger {
  color: var(--token-error) !important;
}

.chat-sheet__danger .chat-sheet__icon {
  background: color-mix(in srgb, var(--token-error) 12%, var(--token-bg));
  color: var(--token-error);
}

.chat-sheet__cancel {
  display: flex;
  align-items: center;
  justify-content: center;
  border-top: 1px solid var(--token-border);
  padding: 0.95rem 1rem;
  min-height: 3rem;
  color: var(--token-text-muted) !important;
  font-size: 1rem;
}
</style>
