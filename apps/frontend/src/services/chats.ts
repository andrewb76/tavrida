import { bffAuthHeaders } from './apiAuth';

export type ChatKind = 'DIRECT' | 'GROUP' | 'TOPIC';

export type ChatListItem = {
  id: string;
  kind: ChatKind;
  self: boolean;
  title: string | null;
  contextType: string | null;
  contextId: string | null;
  unreadCount: number;
  lastMessageAt: string | null;
};

export type ChatDto = {
  id: string;
  kind: ChatKind;
  self: boolean;
  title: string | null;
  contextType: string | null;
  contextId: string | null;
};

export type ChatMessage = {
  id: string;
  chatId: string;
  authorId: string;
  body: string;
  mentions: Array<{
    userId: string;
    username: string;
    offset: number;
    length: number;
  }>;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
};

export type ChatUnread = {
  chatsWithUnread: number;
  totalUnreadMessages: number;
};

export type ChatUserHit = {
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

function apiBase(): string {
  return import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
}

async function parseError(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as {
    message?: string | { message?: string };
    detail?: string;
  };
  if (typeof body.message === 'string') return body.message;
  if (typeof body.message?.message === 'string') return body.message.message;
  if (typeof body.detail === 'string') return body.detail;
  return fallback;
}

export function chatKindLabel(kind: ChatKind, self?: boolean): string {
  if (kind === 'DIRECT' && self) return 'Заметки';
  if (kind === 'DIRECT') return 'Личный';
  if (kind === 'GROUP') return 'Группа';
  return 'Тема форума';
}

export function chatListTitle(row: ChatListItem): string {
  if (row.title?.trim()) return row.title.trim();
  if (row.self) return 'Заметки';
  return chatKindLabel(row.kind, row.self);
}

export async function listChats(kind?: ChatKind): Promise<ChatListItem[]> {
  const params = kind ? `?kind=${encodeURIComponent(kind)}` : '';
  const res = await fetch(`${apiBase()}/chats${params}`, {
    headers: await bffAuthHeaders(undefined, { json: false }),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Не удалось загрузить чаты'));
  return (await res.json()) as ChatListItem[];
}

export async function getChatsUnread(): Promise<ChatUnread> {
  const res = await fetch(`${apiBase()}/chats/unread`, {
    headers: await bffAuthHeaders(undefined, { json: false }),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Не удалось загрузить непрочитанные'));
  return (await res.json()) as ChatUnread;
}

export async function getOrCreateSelfChat(): Promise<ChatDto> {
  const res = await fetch(`${apiBase()}/chats/self`, {
    headers: await bffAuthHeaders(undefined, { json: false }),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Не удалось открыть заметки'));
  return (await res.json()) as ChatDto;
}

export async function openDirectChat(userId: string): Promise<ChatDto> {
  const res = await fetch(`${apiBase()}/chats/direct`, {
    method: 'POST',
    headers: await bffAuthHeaders(),
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Не удалось открыть чат'));
  return (await res.json()) as ChatDto;
}

export async function createGroupChat(input: {
  title?: string;
  memberIds: string[];
}): Promise<ChatDto> {
  const res = await fetch(`${apiBase()}/chats/groups`, {
    method: 'POST',
    headers: await bffAuthHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Не удалось создать группу'));
  return (await res.json()) as ChatDto;
}

export async function spawnGroupFromDirect(
  directChatId: string,
  input: {
    title?: string;
    memberIds?: string[];
    copyHistory?: boolean;
    copyCount?: number;
  },
): Promise<ChatDto> {
  const res = await fetch(`${apiBase()}/chats/${directChatId}/spawn-group`, {
    method: 'POST',
    headers: await bffAuthHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Не удалось создать группу из чата'));
  return (await res.json()) as ChatDto;
}

export async function inviteToGroup(
  chatId: string,
  memberIds: string[],
): Promise<ChatDto> {
  const res = await fetch(`${apiBase()}/chats/${chatId}/members`, {
    method: 'POST',
    headers: await bffAuthHeaders(),
    body: JSON.stringify({ memberIds }),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Не удалось пригласить'));
  return (await res.json()) as ChatDto;
}

export async function leaveGroup(chatId: string): Promise<void> {
  const res = await fetch(`${apiBase()}/chats/${chatId}/leave`, {
    method: 'POST',
    headers: await bffAuthHeaders(),
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Не удалось выйти из группы'));
}

export async function getTopicChat(forumTopicId: string): Promise<ChatDto> {
  const res = await fetch(`${apiBase()}/chats/topics/${forumTopicId}`, {
    headers: await bffAuthHeaders(undefined, { json: false }),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Чат темы недоступен'));
  return (await res.json()) as ChatDto;
}

export async function getChat(chatId: string): Promise<ChatDto> {
  const res = await fetch(`${apiBase()}/chats/${chatId}`, {
    headers: await bffAuthHeaders(undefined, { json: false }),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Чат не найден'));
  return (await res.json()) as ChatDto;
}

export async function listChatMessages(
  chatId: string,
  limit = 50,
): Promise<ChatMessage[]> {
  const res = await fetch(
    `${apiBase()}/chats/${chatId}/messages?limit=${limit}`,
    { headers: await bffAuthHeaders(undefined, { json: false }) },
  );
  if (!res.ok) throw new Error(await parseError(res, 'Не удалось загрузить сообщения'));
  const rows = (await res.json()) as ChatMessage[];
  return [...rows].reverse();
}

export async function sendChatMessage(
  chatId: string,
  body: string,
): Promise<ChatMessage> {
  const res = await fetch(`${apiBase()}/chats/${chatId}/messages`, {
    method: 'POST',
    headers: await bffAuthHeaders(),
    body: JSON.stringify({ body }),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Не удалось отправить'));
  return (await res.json()) as ChatMessage;
}

export async function markChatRead(chatId: string, messageId?: string): Promise<void> {
  const res = await fetch(`${apiBase()}/chats/${chatId}/read`, {
    method: 'POST',
    headers: await bffAuthHeaders(),
    body: JSON.stringify(messageId ? { messageId } : {}),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Не удалось отметить прочитанным'));
}

export async function searchChatUsers(q: string): Promise<ChatUserHit[]> {
  const res = await fetch(
    `${apiBase()}/chats/users/search?q=${encodeURIComponent(q)}`,
    { headers: await bffAuthHeaders(undefined, { json: false }) },
  );
  if (!res.ok) throw new Error(await parseError(res, 'Поиск не удался'));
  const json = (await res.json()) as { data: ChatUserHit[] };
  return json.data ?? [];
}
