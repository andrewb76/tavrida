import { bffAuthHeaders } from './apiAuth';

export type PlatformRole = 'member' | 'admin' | 'moderator' | 'expert';

export type AdminUserRow = {
  userId: string;
  displayName: string | null;
  email: string | null;
  username: string | null;
  avatarUrl: string | null;
  isSuspended: boolean;
  inviterId: string | null;
  invitationAcceptedAt: string | null;
  logtoSyncedAt: string | null;
  createdAt: string;
  roles: PlatformRole[];
  balance: number;
  currency: string;
};

function apiBase(): string {
  return import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
}

async function adminFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: await bffAuthHeaders(init?.headers, { skipActAs: true }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(err?.detail ?? `Admin API error (${res.status})`);
  }

  return res;
}

export async function fetchAdminUsers(params?: {
  offset?: number;
  limit?: number;
  q?: string;
}): Promise<{ data: AdminUserRow[]; pagination: { offset: number; limit: number; total: number } }> {
  const qs = new URLSearchParams();
  if (params?.offset != null) qs.set('offset', String(params.offset));
  if (params?.limit != null) qs.set('limit', String(params.limit));
  if (params?.q) qs.set('q', params.q);
  const suffix = qs.size ? `?${qs.toString()}` : '';
  const res = await adminFetch(`/admin/users${suffix}`);
  return (await res.json()) as {
    data: AdminUserRow[];
    pagination: { offset: number; limit: number; total: number };
  };
}

export async function patchAdminUserRoles(
  userId: string,
  roles: Partial<Record<Exclude<PlatformRole, 'member'>, boolean>>,
): Promise<{ userId: string; roles: PlatformRole[] }> {
  const res = await adminFetch(`/admin/users/${encodeURIComponent(userId)}/roles`, {
    method: 'PATCH',
    body: JSON.stringify(roles),
  });
  return (await res.json()) as { userId: string; roles: PlatformRole[] };
}

export async function adminDepositUser(
  userId: string,
  amount: number,
  description?: string,
): Promise<{ transactionId: string; balanceAfter: number; balance: number; currency: string }> {
  const res = await adminFetch(`/admin/users/${encodeURIComponent(userId)}/wallet/deposit`, {
    method: 'POST',
    body: JSON.stringify({ amount, description }),
  });
  return (await res.json()) as {
    transactionId: string;
    balanceAfter: number;
    balance: number;
    currency: string;
  };
}

export const ROLE_LABELS: Record<PlatformRole, string> = {
  member: 'Участник',
  admin: 'Администратор',
  moderator: 'Модератор',
  expert: 'Эксперт',
};

export const MANAGED_ROLES = ['admin', 'moderator', 'expert'] as const;
