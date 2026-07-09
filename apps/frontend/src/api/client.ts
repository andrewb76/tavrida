import { mockAuctions, mockBalance, mockForumTopics } from './mock/fixtures';

const useMock = import.meta.env.VITE_USE_MOCK !== 'false';

async function mockFetch<T>(path: string): Promise<T> {
  await new Promise((r) => setTimeout(r, 80));
  if (path === '/auctions' || path.startsWith('/auctions?')) {
    return mockAuctions as T;
  }
  if (path === '/wallets/balance') {
    return { amount: mockBalance } as T;
  }
  if (path.startsWith('/forum/topics')) {
    return mockForumTopics as T;
  }
  throw new Error(`Mock API: no fixture for ${path}`);
}

/** GET helper — mock by default until BFF is ready. */
export async function apiGet<T>(path: string): Promise<T> {
  if (useMock) {
    return mockFetch<T>(path);
  }
  const base = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
  const res = await fetch(`${base}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export { useMock };
