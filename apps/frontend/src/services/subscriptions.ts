import { bffAuthHeaders } from './apiAuth';
import type { EventSubscription, SourceDomain, TargetType } from './subscription-helpers';

export type { EventSubscription, SourceDomain, TargetType };

export {
  findSubscription,
  sourceDomainLabel,
  subscriptionHref,
  subscriptionLabel,
  targetTypeLabel,
} from './subscription-helpers';

export type DeliveryPreference = {
  userId: string;
  emailDigestEnabled: boolean;
  pushEnabled: boolean;
  digestFrequency: 'DAILY' | 'WEEKLY';
  quietHours: { start: string; end: string; tz: string } | null;
  updatedAt: string | null;
};

function apiBase(): string {
  return import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
}

async function authHeaders(): Promise<HeadersInit> {
  return bffAuthHeaders();
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

export async function getDeliveryPreference(): Promise<DeliveryPreference> {
  const res = await fetch(`${apiBase()}/subscriptions/delivery`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить настройки доставки');
  return (await res.json()) as DeliveryPreference;
}

export async function updateDeliveryPreference(
  input: Partial<{
    emailDigestEnabled: boolean;
    pushEnabled: boolean;
    digestFrequency: 'DAILY' | 'WEEKLY';
    quietHours: { start: string; end: string; tz: string } | null;
  }>,
): Promise<DeliveryPreference> {
  const res = await fetch(`${apiBase()}/subscriptions/delivery`, {
    method: 'PATCH',
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
    if (raw?.toLowerCase().includes('digest') || raw?.includes('plan')) {
      throw new Error('Email digest недоступен на вашем тарифе');
    }
    throw new Error(raw ?? 'Не удалось сохранить настройки доставки');
  }
  return (await res.json()) as DeliveryPreference;
}
