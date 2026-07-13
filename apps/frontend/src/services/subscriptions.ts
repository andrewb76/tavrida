import { requireBearerToken } from './apiAuth';

export type SourceDomain = 'auction' | 'forum' | 'marketplace' | 'platform';

export type TargetType =
  | 'AUCTION_CATEGORY'
  | 'AUCTION'
  | 'FORUM_CATEGORY'
  | 'FORUM_TOPIC'
  | 'TAG'
  | 'MARKETPLACE_CATEGORY'
  | 'DIGEST_GLOBAL';

export type EventSubscription = {
  id: string;
  userId: string;
  sourceDomain: SourceDomain;
  targetType: TargetType;
  targetId: string | null;
  options: Record<string, unknown>;
  createdAt: string;
};

function apiBase(): string {
  return import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
}

async function authHeaders(): Promise<HeadersInit> {
  const token = await requireBearerToken();
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export async function listEventSubscriptions(
  sourceDomain?: SourceDomain,
): Promise<EventSubscription[]> {
  const params = sourceDomain ? `?sourceDomain=${encodeURIComponent(sourceDomain)}` : '';
  const res = await fetch(`${apiBase()}/subscriptions${params}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить подписки');
  const json = (await res.json()) as { data: EventSubscription[] };
  return json.data;
}

export async function createEventSubscription(input: {
  sourceDomain: SourceDomain;
  targetType: TargetType;
  targetId?: string;
  options?: Record<string, unknown>;
}): Promise<EventSubscription> {
  const res = await fetch(`${apiBase()}/subscriptions`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      message?: string | { message?: string };
    };
    const raw =
      typeof body.message === 'string'
        ? body.message
        : typeof body.message?.message === 'string'
          ? body.message.message
          : null;
    if (raw?.includes('limit')) {
      throw new Error('Лимит подписок по тарифу исчерпан');
    }
    throw new Error(raw ?? 'Не удалось подписаться');
  }
  return (await res.json()) as EventSubscription;
}

export async function deleteEventSubscription(id: string): Promise<void> {
  const res = await fetch(`${apiBase()}/subscriptions/${id}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось отписаться');
}

export function findSubscription(
  rows: EventSubscription[],
  targetType: TargetType,
  targetId: string,
): EventSubscription | undefined {
  return rows.find((row) => row.targetType === targetType && row.targetId === targetId);
}
