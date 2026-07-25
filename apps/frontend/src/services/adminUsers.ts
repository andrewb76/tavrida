import { bffAuthHeaders } from './apiAuth';

export type PlatformRole = 'member' | 'admin' | 'moderator' | 'expert';

export type AdminUserAccessGroup = {
  id: string;
  name: string;
};

export type AdminUserRow = {
  userId: string;
  displayName: string | null;
  email: string | null;
  username: string | null;
  avatarUrl: string | null;
  isSuspended: boolean;
  isHardLocked: boolean;
  hardLockedAt: string | null;
  inviterId: string | null;
  inviterDisplayName: string | null;
  invitationAcceptedAt: string | null;
  deletedAt: string | null;
  logtoSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
  roles: PlatformRole[];
  balance: number;
  currency: string;
  rating: {
    totalRating: number;
    karma: number;
    effectiveKarma: number;
    effectiveRating: number;
    verifiedSales: number;
    pendingSales: number;
    feedbackCoverage: number | null;
    banUntil: string | null;
    isLimited: boolean;
  };
  invites: {
    issued: number;
    thisMonth: number;
    monthlyLimit: number | null;
    remaining: number | null;
  };
  referral: {
    l1: number;
    l2: number;
  };
  plan: {
    planId: string;
    status: string;
    autoRenew: boolean;
    expiresAt: string | null;
  };
  accessGroups: AdminUserAccessGroup[];
};

export type AdminWalletTransaction = {
  id: string;
  type: string;
  amount: number;
  description: string;
  target: string | null;
  createdAt: string;
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

const EMPTY_RATING: AdminUserRow['rating'] = {
  totalRating: 0,
  karma: 0,
  effectiveKarma: 0,
  effectiveRating: 0,
  verifiedSales: 0,
  pendingSales: 0,
  feedbackCoverage: null,
  banUntil: null,
  isLimited: false,
};

const EMPTY_INVITES: AdminUserRow['invites'] = {
  issued: 0,
  thisMonth: 0,
  monthlyLimit: null,
  remaining: null,
};

const EMPTY_REFERRAL: AdminUserRow['referral'] = { l1: 0, l2: 0 };

const EMPTY_PLAN: AdminUserRow['plan'] = {
  planId: 'free',
  status: 'ACTIVE',
  autoRenew: false,
  expiresAt: null,
};

function normalizeAdminUserRow(raw: Partial<AdminUserRow> & { userId: string }): AdminUserRow {
  return {
    userId: raw.userId,
    displayName: raw.displayName ?? null,
    email: raw.email ?? null,
    username: raw.username ?? null,
    avatarUrl: raw.avatarUrl ?? null,
    isSuspended: Boolean(raw.isSuspended),
    isHardLocked: Boolean(raw.isHardLocked),
    hardLockedAt: raw.hardLockedAt ?? null,
    inviterId: raw.inviterId ?? null,
    inviterDisplayName: raw.inviterDisplayName ?? null,
    invitationAcceptedAt: raw.invitationAcceptedAt ?? null,
    deletedAt: raw.deletedAt ?? null,
    logtoSyncedAt: raw.logtoSyncedAt ?? null,
    createdAt: raw.createdAt ?? new Date(0).toISOString(),
    updatedAt: raw.updatedAt ?? raw.createdAt ?? new Date(0).toISOString(),
    roles: Array.isArray(raw.roles) ? raw.roles : ['member'],
    balance: typeof raw.balance === 'number' ? raw.balance : 0,
    currency: raw.currency ?? 'RUB',
    rating: { ...EMPTY_RATING, ...(raw.rating ?? {}) },
    invites: { ...EMPTY_INVITES, ...(raw.invites ?? {}) },
    referral: { ...EMPTY_REFERRAL, ...(raw.referral ?? {}) },
    plan: { ...EMPTY_PLAN, ...(raw.plan ?? {}) },
    accessGroups: Array.isArray(raw.accessGroups) ? raw.accessGroups : [],
  };
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
  const body = (await res.json()) as {
    data: Array<Partial<AdminUserRow> & { userId: string }>;
    pagination: { offset: number; limit: number; total: number };
  };
  return {
    data: (body.data ?? []).map(normalizeAdminUserRow),
    pagination: body.pagination ?? { offset: 0, limit: 50, total: 0 },
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

export async function patchAdminUserHardLock(
  userId: string,
  locked: boolean,
): Promise<{
  userId: string;
  isHardLocked: boolean;
  hardLockedAt: string | null;
  hardLockedBy: string | null;
}> {
  const res = await adminFetch(`/admin/users/${encodeURIComponent(userId)}/hard-lock`, {
    method: 'PATCH',
    body: JSON.stringify({ locked }),
  });
  return (await res.json()) as {
    userId: string;
    isHardLocked: boolean;
    hardLockedAt: string | null;
    hardLockedBy: string | null;
  };
}

export async function forceSyncAdminUser(userId: string): Promise<{
  userId: string;
  synced: boolean;
  displayName: string | null;
  email: string | null;
  username: string | null;
  avatarUrl: string | null;
  isSuspended: boolean;
  logtoSyncedAt: string;
}> {
  const res = await adminFetch(`/admin/users/${encodeURIComponent(userId)}/sync-logto`, {
    method: 'POST',
  });
  return (await res.json()) as {
    userId: string;
    synced: boolean;
    displayName: string | null;
    email: string | null;
    username: string | null;
    avatarUrl: string | null;
    isSuspended: boolean;
    logtoSyncedAt: string;
  };
}

export async function fetchAdminUserWalletTransactions(
  userId: string,
  limit = 50,
): Promise<AdminWalletTransaction[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  const res = await adminFetch(
    `/admin/users/${encodeURIComponent(userId)}/wallet/transactions?${qs}`,
  );
  const body = (await res.json()) as { data: AdminWalletTransaction[] };
  return body.data ?? [];
}

export const ROLE_LABELS: Record<PlatformRole, string> = {
  member: 'Участник',
  admin: 'Администратор',
  moderator: 'Модератор',
  expert: 'Эксперт',
};

export const ROLE_BADGE_LABELS: Record<PlatformRole, string> = {
  member: 'member',
  admin: 'admin',
  moderator: 'moderator',
  expert: 'expert',
};

export const MANAGED_ROLES = ['admin', 'moderator', 'expert'] as const;
