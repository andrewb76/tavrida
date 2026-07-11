import { requireBearerToken } from './apiAuth';

export type AdminPlan = {
  id: string;
  title: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  isActive: boolean;
};

export type TierValue = {
  limitValue: number | null;
  isFeatureEnabled: boolean;
  enumValues: string[] | null;
  priceAmount: number | null;
  isEnabled: boolean;
};

export type PlanVariable = {
  key: string;
  service: string;
  name: string;
  description: string;
  valueType: 'limit' | 'feature' | 'enum' | 'price';
  syncStatus: 'active' | 'stale';
  tiers: Record<string, TierValue>;
};

const PLAN_IDS = ['free', 'basic', 'pro'] as const;
export const PLAN_CONFIG_TIER_IDS = PLAN_IDS;

export const SERVICE_TAB_LABELS: Record<string, string> = {
  auction: 'Аукцион',
  forum: 'Форум',
  club: 'Клуб',
  bff: 'Клуб',
  referralRewards: 'Рефералы',
  'user-profile': 'Профиль',
};

function apiBase(): string {
  return import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
}

async function adminFetch(path: string, init?: RequestInit) {
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
    let detail = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { detail?: string; message?: string | string[] };
      if (typeof body.detail === 'string') detail = body.detail;
      else if (typeof body.message === 'string') detail = body.message;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  return res;
}

export async function fetchAdminPlans(): Promise<AdminPlan[]> {
  const res = await adminFetch('/admin/plan-config/plans');
  const json = (await res.json()) as { data: AdminPlan[] };
  return json.data;
}

export async function saveAdminPlan(
  planId: string,
  patch: Partial<Pick<AdminPlan, 'title' | 'description' | 'monthlyPrice' | 'yearlyPrice' | 'isActive'>>,
): Promise<AdminPlan> {
  const res = await adminFetch(`/admin/plan-config/plans/${planId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  const json = (await res.json()) as { data: AdminPlan };
  return json.data;
}

export async function fetchPlanVariables(): Promise<PlanVariable[]> {
  const res = await adminFetch('/admin/plan-config/variables');
  const json = (await res.json()) as { data: PlanVariable[] };
  return json.data;
}

export async function savePlanVariable(
  variableKey: string,
  tierValues: Record<string, Partial<TierValue>>,
): Promise<void> {
  await adminFetch(`/admin/plan-config/variables/${encodeURIComponent(variableKey)}`, {
    method: 'PATCH',
    body: JSON.stringify({ tierValues }),
  });
}

export async function deletePlanVariable(variableKey: string): Promise<void> {
  await adminFetch(`/admin/plan-config/variables/${encodeURIComponent(variableKey)}`, {
    method: 'DELETE',
  });
}

export function formatLimitValue(value: number | null): string {
  if (value === null) return '—';
  if (value < 0) return '∞';
  return String(value);
}

/** Group label from key segments 2..n-1 (facet.orderedGroup). */
export function variableGroupKey(key: string): string {
  const parts = key.split('.');
  if (parts.length <= 2) return parts.slice(1).join('.') || key;
  return parts.slice(1, -1).join('.');
}

export function serviceTabLabel(service: string): string {
  return SERVICE_TAB_LABELS[service] ?? service;
}
