import { bffAuthHeaders } from './apiAuth';

/** Human-readable invite code: TAV-XXXX-XXXX (no ambiguous chars). */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_PATTERN = /^TAV-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export type InviteRecord = {
  id?: string;
  code: string;
  token?: string;
  inviterId?: string;
  email?: string;
  createdAt: string;
  expiresAt: string;
  link?: string;
  status?: 'active' | 'redeemed' | 'expired';
  usesCount?: number;
  maxUses?: number;
};

export type ResolvedInvite = {
  token: string;
  email?: string;
  inviterId?: string;
  inviteCodeId?: string;
  code?: string;
};

export type CreatedInvite = {
  id?: string;
  code: string;
  link: string;
  email?: string;
  expiresAt: string;
  createdAt?: string;
};

const MOCK_STORE_KEY = 'tavrida.invites.mock';
const PENDING_INVITER_KEY = 'tavrida.invite.pendingInviter';
const PENDING_INVITE_CODE_ID_KEY = 'tavrida.invite.pendingInviteCodeId';

function randomPart(length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

export function formatInviteCode(): string {
  return `TAV-${randomPart(4)}-${randomPart(4)}`;
}

export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidInviteCodeFormat(code: string): boolean {
  return CODE_PATTERN.test(normalizeInviteCode(code));
}

async function authHeaders(): Promise<HeadersInit> {
  return bffAuthHeaders();
}

function apiBase(): string {
  return import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
}

function readMockStore(): Record<string, InviteRecord> {
  try {
    const raw = localStorage.getItem(MOCK_STORE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, InviteRecord>) : {};
  } catch {
    return {};
  }
}

function writeMockStore(store: Record<string, InviteRecord>): void {
  localStorage.setItem(MOCK_STORE_KEY, JSON.stringify(store));
}

function buildJoinLink(params: { code?: string; token?: string; email?: string }): string {
  const url = new URL('/join', window.location.origin);
  if (params.code) {
    url.searchParams.set('code', params.code);
  } else {
    if (params.token) url.searchParams.set('token', params.token);
    if (params.email) url.searchParams.set('email', params.email);
  }
  return url.toString();
}

function parseErrorBody(body: unknown, fallback: string): string {
  if (body && typeof body === 'object') {
    const record = body as { detail?: string; message?: string | string[] };
    if (record.detail) return record.detail;
    if (typeof record.message === 'string') return record.message;
    if (Array.isArray(record.message)) return record.message.join(', ');
  }
  return fallback;
}

/** Parse pasted link or raw TAV- code. */
export function parseInviteInput(input: string): {
  code?: string;
  token?: string;
  email?: string;
} {
  const trimmed = input.trim();
  if (!trimmed) return {};

  if (isValidInviteCodeFormat(trimmed)) {
    return { code: normalizeInviteCode(trimmed) };
  }

  try {
    const url = new URL(trimmed);
    const code = url.searchParams.get('code');
    const token = url.searchParams.get('token');
    const email = url.searchParams.get('email');
    if (code && isValidInviteCodeFormat(code)) {
      return { code: normalizeInviteCode(code), token: token ?? undefined, email: email ?? undefined };
    }
    return {
      token: token ?? undefined,
      email: email ?? undefined,
      code: code ? normalizeInviteCode(code) : undefined,
    };
  } catch {
    return {};
  }
}

export function setPendingInviterId(inviterId: string): void {
  sessionStorage.setItem(PENDING_INVITER_KEY, inviterId);
}

export function setPendingInviteCodeId(inviteCodeId: string): void {
  sessionStorage.setItem(PENDING_INVITE_CODE_ID_KEY, inviteCodeId);
}

export function consumePendingInviterId(): string | null {
  const id = sessionStorage.getItem(PENDING_INVITER_KEY);
  sessionStorage.removeItem(PENDING_INVITER_KEY);
  return id;
}

export function consumePendingInviteCodeId(): string | null {
  const id = sessionStorage.getItem(PENDING_INVITE_CODE_ID_KEY);
  sessionStorage.removeItem(PENDING_INVITE_CODE_ID_KEY);
  return id;
}

/** Create invite — `POST /api/v1/invites`. */
export async function createInvite(options?: {
  email?: string;
  inviterId?: string;
}): Promise<CreatedInvite> {
  const email = options?.email?.trim() || undefined;
  const validityDays = 14;
  const expiresAt = new Date(Date.now() + validityDays * 864e5).toISOString();

  if (import.meta.env.VITE_USE_MOCK !== 'false') {
    await new Promise((r) => setTimeout(r, 120));
    const code = formatInviteCode();
    const token = `dev-${crypto.randomUUID()}`;
    const record: InviteRecord = {
      code,
      token,
      inviterId: options?.inviterId,
      email,
      createdAt: new Date().toISOString(),
      expiresAt,
    };
    const store = readMockStore();
    store[code] = record;
    writeMockStore(store);
    return {
      code,
      link: buildJoinLink({ code }),
      email,
      expiresAt,
    };
  }

  const res = await fetch(`${apiBase()}/invites`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(parseErrorBody(body, `Create invite failed (${res.status})`));
  }
  return res.json() as Promise<CreatedInvite>;
}

/** Resolve code or token — `GET /api/v1/invites/resolve`. */
export async function resolveInvite(params: {
  code?: string;
  token?: string;
  email?: string;
}): Promise<ResolvedInvite> {
  const code = params.code ? normalizeInviteCode(params.code) : undefined;

  if (import.meta.env.VITE_USE_MOCK !== 'false') {
    await new Promise((r) => setTimeout(r, 80));
    if (code) {
      const record = readMockStore()[code];
      if (!record) throw new Error('Код не найден или истёк');
      if (new Date(record.expiresAt) < new Date()) {
        throw new Error('Срок действия приглашения истёк');
      }
      return {
        code,
        token: record.token!,
        email: record.email ?? params.email,
        inviterId: record.inviterId,
      };
    }
    if (params.token) {
      return { token: params.token, email: params.email };
    }
    throw new Error('Укажите код или ссылку приглашения');
  }

  const qs = new URLSearchParams();
  if (code) qs.set('code', code);
  if (params.token) qs.set('token', params.token);
  const res = await fetch(`${apiBase()}/invites/resolve?${qs}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(parseErrorBody(body, `Resolve failed (${res.status})`));
  }
  return res.json() as Promise<ResolvedInvite>;
}

/** List member invites — `GET /api/v1/invites`. */
export async function listInvites(): Promise<InviteRecord[]> {
  if (import.meta.env.VITE_USE_MOCK !== 'false') {
    return listMockInvites();
  }

  const res = await fetch(`${apiBase()}/invites`, {
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(parseErrorBody(body, `List invites failed (${res.status})`));
  }
  const json = (await res.json()) as { data: InviteRecord[] };
  return json.data;
}

export function listMockInvites(): InviteRecord[] {
  return Object.values(readMockStore()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/** After first sign-in via invite — `POST /api/v1/invites/claim`. */
export async function claimInviteAttribution(options: {
  inviterId?: string;
  inviteCodeId?: string;
  userId?: string;
}): Promise<void> {
  const { inviterId, inviteCodeId, userId } = options;
  if (!inviterId && !inviteCodeId) return;

  if (import.meta.env.VITE_USE_MOCK !== 'false') {
    if (inviterId) localStorage.setItem('tavrida.invite.lastInviter', inviterId);
    if (userId) localStorage.setItem('tavrida.invite.attributedFor', userId);
    return;
  }

  const res = await fetch(`${apiBase()}/invites/claim`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ inviterId, inviteCodeId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(parseErrorBody(body, `Claim failed (${res.status})`));
  }
}
