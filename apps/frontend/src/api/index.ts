import { apiGet as baseApiGet } from './client';
import { useSessionStore } from '@/stores/session';

async function authHeaders(): Promise<HeadersInit> {
  const session = useSessionStore();
  const token = await session.getAccessToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

/** GET with Bearer token when Logto session is active. */
export async function apiGet<T>(path: string): Promise<T> {
  if (import.meta.env.VITE_USE_MOCK !== 'false') {
    return baseApiGet<T>(path);
  }

  const base = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
  const headers = await authHeaders();
  const res = await fetch(`${base}${path}`, { headers });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export { useMock } from './client';
