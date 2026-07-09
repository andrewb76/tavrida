/** Human-readable invite code: TAV-XXXX-XXXX (no ambiguous chars). */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_PATTERN = /^TAV-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export type InviteRecord = {
  code: string;
  token: string;
  inviterId?: string;
  email?: string;
  createdAt: string;
  expiresAt: string;
};

export type ResolvedInvite = {
  token: string;
  email?: string;
  inviterId?: string;
  code?: string;
};

export type CreatedInvite = {
  code: string;
  link: string;
  email?: string;
  expiresAt: string;
};

const MOCK_STORE_KEY = 'tavrida.invites.mock';
const PENDING_INVITER_KEY = 'tavrida.invite.pendingInviter';

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

export function consumePendingInviterId(): string | null {
  const id = sessionStorage.getItem(PENDING_INVITER_KEY);
  sessionStorage.removeItem(PENDING_INVITER_KEY);
  return id;
}

/** Create invite — mock until BFF `POST /invites`. */
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

  const base = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
  const res = await fetch(`${base}/invites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(body.detail ?? `Create invite failed (${res.status})`);
  }
  return res.json() as Promise<CreatedInvite>;
}

/** Resolve code or validate token params — mock: `GET /invites/resolve`. */
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
        token: record.token,
        email: record.email ?? params.email,
        inviterId: record.inviterId,
      };
    }
    if (params.token) {
      return { token: params.token, email: params.email };
    }
    throw new Error('Укажите код или ссылку приглашения');
  }

  const base = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
  const qs = new URLSearchParams();
  if (code) qs.set('code', code);
  if (params.token) qs.set('token', params.token);
  const res = await fetch(`${base}/invites/resolve?${qs}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(body.detail ?? `Resolve failed (${res.status})`);
  }
  return res.json() as Promise<ResolvedInvite>;
}

export function listMockInvites(): InviteRecord[] {
  return Object.values(readMockStore()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/** After first sign-in via invite — attribute referral (mock / BFF). */
export async function claimInviteAttribution(inviterId: string, userId?: string): Promise<void> {
  if (!inviterId) return;

  if (import.meta.env.VITE_USE_MOCK !== 'false') {
    localStorage.setItem('tavrida.invite.lastInviter', inviterId);
    if (userId) localStorage.setItem('tavrida.invite.attributedFor', userId);
    return;
  }

  const base = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
  await fetch(`${base}/invites/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inviterId }),
  });
}
