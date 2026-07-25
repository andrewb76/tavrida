import { bffAuthHeaders } from './apiAuth';

export type ClubSettings = {
  'registration.inviteOnly'?: boolean;
  'invite.validityDays'?: number;
  'invite.codeType'?: 'SINGLE_USE' | 'MULTI_USE';
  'landing.publicSections'?: string[];
};

export type ScalarRegistryEntry = {
  key: string;
  service: string;
  type: string;
  description: string | null;
  syncStatus: 'active' | 'stale';
  defaultValue: unknown;
  value: unknown;
};

function apiBase(): string {
  return import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
}

export async function fetchClubSettings(): Promise<ClubSettings> {
  const res = await fetch(`${apiBase()}/admin/scalar-config/club`, {
    headers: await bffAuthHeaders(undefined, { json: false }),
  });
  if (!res.ok) {
    throw new Error(`Failed to load club settings (${res.status})`);
  }
  return (await res.json()) as ClubSettings;
}

export async function saveClubSettings(patch: ClubSettings): Promise<ClubSettings> {
  const res = await fetch(`${apiBase()}/admin/scalar-config/club`, {
    method: 'PATCH',
    headers: await bffAuthHeaders(undefined, { skipActAs: true }),
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    let detail = `Failed to save club settings (${res.status})`;
    try {
      const body = (await res.json()) as { detail?: string; message?: string | string[] };
      if (typeof body.detail === 'string') detail = body.detail;
      else if (typeof body.message === 'string') detail = body.message;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return (await res.json()) as ClubSettings;
}

export type ForumSettings = {
  'edit.windowMinutes'?: number;
  'vote.changeWindowMinutes'?: number;
};

export type ChatSettings = {
  'spawn.copyHistoryMax'?: number;
  'message.editWindowMinutes'?: number;
  'message.deleteOwnWindowMinutes'?: number;
  'message.lengthHardMax'?: number;
  'message.pageSize'?: number;
  'topic.authorJoinOnPublish'?: boolean;
  'topic.joinOnComment'?: boolean;
  'dm.selfAutoCreate'?: boolean;
  'unread.markReadOnOpen'?: boolean;
  'list.defaultFilter'?: 'ALL' | 'DIRECT' | 'GROUP' | 'TOPIC';
  'group.leaveKeepsHistory'?: boolean;
};

export async function fetchForumSettings(): Promise<ForumSettings> {
  const res = await fetch(`${apiBase()}/admin/scalar-config/forum`, {
    headers: await bffAuthHeaders(undefined, { json: false }),
  });
  if (!res.ok) {
    throw new Error(`Failed to load forum settings (${res.status})`);
  }
  return (await res.json()) as ForumSettings;
}

export async function saveForumSettings(patch: ForumSettings): Promise<ForumSettings> {
  const res = await fetch(`${apiBase()}/admin/scalar-config/forum`, {
    method: 'PATCH',
    headers: await bffAuthHeaders(undefined, { skipActAs: true }),
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    let detail = `Failed to save forum settings (${res.status})`;
    try {
      const body = (await res.json()) as { detail?: string; message?: string | string[] };
      if (typeof body.detail === 'string') detail = body.detail;
      else if (typeof body.message === 'string') detail = body.message;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return (await res.json()) as ForumSettings;
}

export async function fetchChatSettings(): Promise<ChatSettings> {
  const res = await fetch(`${apiBase()}/admin/scalar-config/chat`, {
    headers: await bffAuthHeaders(undefined, { json: false }),
  });
  if (!res.ok) {
    throw new Error(`Failed to load chat settings (${res.status})`);
  }
  return (await res.json()) as ChatSettings;
}

export async function saveChatSettings(patch: ChatSettings): Promise<ChatSettings> {
  const res = await fetch(`${apiBase()}/admin/scalar-config/chat`, {
    method: 'PATCH',
    headers: await bffAuthHeaders(undefined, { skipActAs: true }),
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    let detail = `Failed to save chat settings (${res.status})`;
    try {
      const body = (await res.json()) as { detail?: string; message?: string | string[] };
      if (typeof body.detail === 'string') detail = body.detail;
      else if (typeof body.message === 'string') detail = body.message;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return (await res.json()) as ChatSettings;
}

export async function fetchScalarRegistry(): Promise<ScalarRegistryEntry[]> {
  const res = await fetch(`${apiBase()}/admin/scalar-config/registry`, {
    headers: await bffAuthHeaders(undefined, { json: false }),
  });
  if (!res.ok) {
    throw new Error(`Failed to load scalar registry (${res.status})`);
  }
  const json = (await res.json()) as { data: ScalarRegistryEntry[] };
  return json.data;
}

export async function deleteScalarKey(key: string): Promise<void> {
  const res = await fetch(`${apiBase()}/admin/scalar-config/keys/${encodeURIComponent(key)}`, {
    method: 'DELETE',
    headers: await bffAuthHeaders(undefined, { json: false, skipActAs: true }),
  });
  if (!res.ok) {
    throw new Error(`Failed to delete scalar key (${res.status})`);
  }
}
