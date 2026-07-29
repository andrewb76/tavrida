import { inspectBffAuthFailure } from '@/services/bffErrors';

const INSTALLED = '__tavridaBffAuthFetch';

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function isBffUrl(url: string): boolean {
  const base = (import.meta.env.VITE_API_BASE_URL ?? '/api/v1').replace(/\/$/, '');
  return url.includes(base) || /\/api\/v1(?:\/|$|\?)/.test(url);
}

/**
 * Global fetch hook: 401 stale access token → logout+relogin; 403 hard_locked → trap.
 * Covers all BFF callers without rewriting every service.
 */
export function installBffAuthFetchInterceptor(): void {
  const w = window as Window & { [INSTALLED]?: boolean };
  if (w[INSTALLED]) return;
  w[INSTALLED] = true;

  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const res = await original(input, init);
    if ((res.status === 401 || res.status === 403) && isBffUrl(requestUrl(input))) {
      const body = await res.clone().json().catch(() => null);
      inspectBffAuthFailure(res.status, body);
    }
    return res;
  };
}
