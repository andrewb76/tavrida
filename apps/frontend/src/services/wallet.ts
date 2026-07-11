import { requireBearerToken } from './apiAuth';

export type WalletBalance = {
  userId: string;
  balance: number;
  currency: string;
};

export type WalletTransaction = {
  id: string;
  type: string;
  amount: number;
  description: string;
  target: string | null;
  createdAt: string;
};

const MOCK_BALANCE_KEY = 'tavrida.wallet.mockBalance';
const MOCK_TX_KEY = 'tavrida.wallet.mockTransactions';

function apiBase(): string {
  return import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
}

async function authHeaders(): Promise<HeadersInit> {
  const token = await requireBearerToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
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

function readMockBalance(): number {
  const raw = localStorage.getItem(MOCK_BALANCE_KEY);
  return raw ? Number(raw) : 1250;
}

function writeMockBalance(balance: number): void {
  localStorage.setItem(MOCK_BALANCE_KEY, String(balance));
}

function readMockTransactions(): WalletTransaction[] {
  try {
    const raw = localStorage.getItem(MOCK_TX_KEY);
    return raw ? (JSON.parse(raw) as WalletTransaction[]) : [];
  } catch {
    return [];
  }
}

function writeMockTransactions(rows: WalletTransaction[]): void {
  localStorage.setItem(MOCK_TX_KEY, JSON.stringify(rows.slice(0, 50)));
}

export async function getBalance(): Promise<WalletBalance> {
  if (import.meta.env.VITE_USE_MOCK !== 'false') {
    await new Promise((r) => setTimeout(r, 60));
    return { userId: 'mock', balance: readMockBalance(), currency: 'RUB' };
  }

  const res = await fetch(`${apiBase()}/wallets/balance`, { headers: await authHeaders() });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(parseErrorBody(body, `Balance failed (${res.status})`));
  }
  return res.json() as Promise<WalletBalance>;
}

export async function listTransactions(limit = 20): Promise<WalletTransaction[]> {
  if (import.meta.env.VITE_USE_MOCK !== 'false') {
    return readMockTransactions();
  }

  const qs = new URLSearchParams({ limit: String(limit) });
  const res = await fetch(`${apiBase()}/wallets/transactions?${qs}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(parseErrorBody(body, `Transactions failed (${res.status})`));
  }
  return res.json() as Promise<WalletTransaction[]>;
}

export async function deposit(amount: number): Promise<{ balanceAfter: number }> {
  if (import.meta.env.VITE_USE_MOCK !== 'false') {
    await new Promise((r) => setTimeout(r, 120));
    const balanceAfter = readMockBalance() + amount;
    writeMockBalance(balanceAfter);
    const tx: WalletTransaction = {
      id: crypto.randomUUID(),
      type: 'DEPOSIT',
      amount,
      description: 'Пополнение баланса',
      target: null,
      createdAt: new Date().toISOString(),
    };
    writeMockTransactions([tx, ...readMockTransactions()]);
    return { balanceAfter };
  }

  const res = await fetch(`${apiBase()}/wallets/deposit`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ amount }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(parseErrorBody(body, `Deposit failed (${res.status})`));
  }
  const json = (await res.json()) as { balanceAfter: number };
  return { balanceAfter: json.balanceAfter };
}

export function formatMoney(amount: number, currency = 'RUB'): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatTransactionAmount(tx: WalletTransaction): string {
  const sign = tx.type === 'DEPOSIT' || tx.type === 'CREDIT' || tx.type === 'REFUND' ? '+' : '−';
  return `${sign}${formatMoney(tx.amount)}`;
}
