import { requireBearerToken } from './apiAuth';

export type ProfileRatingStats = {
  userId: string;
  totalRating: number;
  karma: number;
  referralKarma: number;
  referralRating: number;
  effectiveKarma: number;
  effectiveRating: number;
  verifiedSales: number;
  pendingSales: number;
  feedbackCoverage: number | null;
};

export type PublicProfile = {
  userId: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  isSuspended: boolean;
  memberSince: string;
  rating: ProfileRatingStats;
};

export type ProfileNote = {
  id: string;
  ownerId: string;
  authorId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
};

function apiBase(): string {
  return import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
}

async function profileFetch(path: string, init?: RequestInit) {
  const token = await requireBearerToken();
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let detail = 'Запрос не удался';
    try {
      const body = (await res.json()) as { detail?: string; message?: string | string[] };
      if (typeof body.detail === 'string') detail = body.detail;
      else if (typeof body.message === 'string') detail = body.message;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  if (res.status === 204) return null;
  const text = await res.text();
  return text ? (JSON.parse(text) as unknown) : null;
}

export function publicProfileLabel(profile: Pick<PublicProfile, 'displayName' | 'username' | 'userId'>): string {
  return profile.displayName?.trim() || profile.username?.trim() || 'Участник';
}

export function formatRating(value: number, verifiedSales: number): string {
  if (verifiedSales <= 0 || value <= 0) return '—';
  return value.toFixed(1);
}

export function formatKarma(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return rounded > 0 ? `+${rounded}` : String(rounded);
}

export async function fetchPublicProfile(userId: string): Promise<PublicProfile> {
  try {
    return (await profileFetch(`/profile/${encodeURIComponent(userId)}`)) as PublicProfile;
  } catch (e) {
    if (e instanceof Error && e.message.includes('not found')) {
      throw new Error('Пользователь не найден');
    }
    throw e;
  }
}

export async function fetchProfileNote(ownerId: string): Promise<ProfileNote | null> {
  return (await profileFetch(
    `/profile/notes?ownerId=${encodeURIComponent(ownerId)}`,
  )) as ProfileNote | null;
}

export async function saveProfileNote(ownerId: string, text: string): Promise<ProfileNote> {
  return (await profileFetch('/profile/notes', {
    method: 'POST',
    body: JSON.stringify({ ownerId, text }),
  })) as ProfileNote;
}

export async function deleteProfileNote(noteId: string): Promise<void> {
  await profileFetch(`/profile/notes/${encodeURIComponent(noteId)}`, { method: 'DELETE' });
}

export async function adjustProfileRating(
  userId: string,
  patch: { karmaDelta?: number; ratingDelta?: number },
): Promise<ProfileRatingStats> {
  return (await profileFetch(`/profile/${encodeURIComponent(userId)}/rating/adjust`, {
    method: 'POST',
    body: JSON.stringify(patch),
  })) as ProfileRatingStats;
}

export type ReputationLogEntry = {
  id: string;
  userId: string;
  metric: 'karma' | 'rating';
  delta: number;
  balanceAfter: number;
  source: string;
  actorId: string | null;
  referenceId: string | null;
  note: string | null;
  createdAt: string;
};

export async function fetchReputationLog(
  userId: string,
  metric: 'karma' | 'rating',
  limit = 50,
): Promise<ReputationLogEntry[]> {
  const params = new URLSearchParams({ metric, limit: String(limit) });
  const json = (await profileFetch(
    `/profile/${encodeURIComponent(userId)}/rating/log?${params}`,
  )) as { data: ReputationLogEntry[] };
  return json.data;
}

export function reputationSourceLabel(source: string): string {
  switch (source) {
    case 'ADMIN_ADJUST':
      return 'Корректировка админа';
    case 'FORUM_VOTE':
      return 'Голос на форуме';
    case 'DEAL_FEEDBACK':
      return 'Отзыв по сделке';
    case 'REFERRAL':
      return 'Реферальный вклад';
    case 'BONUS':
      return 'Бонус';
    case 'PENALTY':
      return 'Штраф';
    case 'SYSTEM':
      return 'Система';
    default:
      return source;
  }
}
