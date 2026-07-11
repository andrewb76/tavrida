import { requireBearerToken } from './apiAuth';
import type { OracleDefaultsResponse, OracleSimulateRequest, SimulateResult } from './oracle.types';

function apiBase(): string {
  return import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
}

async function oracleFetch<T>(path: string, init?: RequestInit): Promise<T> {
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
    let detail = `Oracle API error (${res.status})`;
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

export async function fetchOracleDefaults(): Promise<OracleDefaultsResponse> {
  return oracleFetch<OracleDefaultsResponse>('/admin/oracle/defaults');
}

export async function simulateOracle(body: OracleSimulateRequest): Promise<SimulateResult> {
  return oracleFetch<SimulateResult>('/admin/oracle/simulate', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function compareOracle(
  scenarios: (OracleSimulateRequest & { scenarioId: string })[],
): Promise<{ scenarioId: string; result: SimulateResult }[]> {
  return oracleFetch('/admin/oracle/compare', {
    method: 'POST',
    body: JSON.stringify({ scenarios }),
  });
}
