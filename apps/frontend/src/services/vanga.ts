import { requireBearerToken } from './apiAuth';
import type { VangaDefaultsResponse, VangaSimulateRequest, SimulateResult } from './vanga.types';

function apiBase(): string {
  return import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
}

async function vangaFetch<T>(path: string, init?: RequestInit): Promise<T> {
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
    let detail = `Vanga API error (${res.status})`;
    try {
      const body = (await res.json()) as { detail?: string; message?: string | string[] };
      if (typeof body.detail === 'string') detail = body.detail;
      else if (typeof body.message === 'string') detail = body.message;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return (await res.json()) as T;
}

export async function fetchVangaDefaults(): Promise<VangaDefaultsResponse> {
  return vangaFetch<VangaDefaultsResponse>('/admin/vanga/defaults');
}

export async function simulateVanga(body: VangaSimulateRequest): Promise<SimulateResult> {
  return vangaFetch<SimulateResult>('/admin/vanga/simulate', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function compareVanga(
  scenarios: (VangaSimulateRequest & { scenarioId: string })[],
): Promise<{ scenarioId: string; result: SimulateResult }[]> {
  return vangaFetch('/admin/vanga/compare', {
    method: 'POST',
    body: JSON.stringify({ scenarios }),
  });
}
