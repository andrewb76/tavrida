import { bffAuthHeaders } from './apiAuth';

export type SettingsPlan = {
  id: string;
  title: string;
  description: string;
  monthlyPrice: string;
  yearlyPrice: string;
  isActive: boolean;
  sortOrder: number;
};

export type SettingsParameter = {
  key: string;
  service: string;
  category: 'system-var' | 'tarif-var' | 'limited-user-var' | 'user-var';
  name: string;
  description: string;
  paramType: string;
  defaultValue: unknown;
  userOverride: boolean;
  sortOrder: number;
  syncStatus: string;
};

function apiBase(): string {
  return import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
}

async function adminFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: await bffAuthHeaders(init?.headers, { skipActAs: true }),
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

export async function fetchSettingsPlans(): Promise<SettingsPlan[]> {
  const res = await adminFetch('/admin/settings/plans');
  const text = await res.text();
  if (!text) return [];
  const json = JSON.parse(text);
  return Array.isArray(json) ? json : json.data ?? [];
}

export async function createSettingsPlan(
  plan: Pick<SettingsPlan, 'id' | 'title' | 'monthlyPrice' | 'yearlyPrice' | 'isActive'>,
): Promise<SettingsPlan> {
  const res = await adminFetch('/admin/settings/plans', {
    method: 'POST',
    body: JSON.stringify({ ...plan, monthlyPrice: Number(plan.monthlyPrice), yearlyPrice: Number(plan.yearlyPrice) }),
  });
  return res.json();
}

export async function updateSettingsPlan(
  planId: string,
  patch: Partial<Pick<SettingsPlan, 'title' | 'description' | 'monthlyPrice' | 'yearlyPrice' | 'isActive'>>,
): Promise<SettingsPlan> {
  const body: Record<string, unknown> = { ...patch };
  if (body.monthlyPrice !== undefined) body.monthlyPrice = Number(body.monthlyPrice);
  if (body.yearlyPrice !== undefined) body.yearlyPrice = Number(body.yearlyPrice);
  const res = await adminFetch(`/admin/settings/plans/${planId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function deleteSettingsPlan(planId: string): Promise<void> {
  await adminFetch(`/admin/settings/plans/${planId}`, { method: 'DELETE' });
}

export async function fetchSettingsParameters(service?: string): Promise<{ data: SettingsParameter[] }> {
  const qs = service ? `?service=${encodeURIComponent(service)}` : '';
  const res = await adminFetch(`/admin/settings/parameters${qs}`);
  return res.json();
}

export async function fetchSystemValues(domain: string): Promise<Record<string, unknown>> {
  const res = await adminFetch(`/admin/settings/system-values/${domain}`);
  const text = await res.text();
  if (!text) return {};
  return JSON.parse(text);
}

export async function patchSystemValues(
  domain: string,
  values: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await adminFetch(`/admin/settings/system-values/${domain}`, {
    method: 'POST',
    body: JSON.stringify({ values }),
  });
  const text = await res.text();
  if (!text) return {};
  return JSON.parse(text);
}

export async function fetchPlanValues(planId?: string): Promise<unknown> {
  const qs = planId ? `?planId=${encodeURIComponent(planId)}` : '';
  const res = await adminFetch(`/admin/settings/plan-values${qs}`);
  const text = await res.text();
  if (!text) return [];
  return JSON.parse(text);
}

export async function setPlanValue(
  planId: string,
  key: string,
  value: unknown,
): Promise<unknown> {
  const res = await adminFetch(`/admin/settings/plan-values/${planId}/${key}`, {
    method: 'PATCH',
    body: JSON.stringify({ value }),
  });
  return res.json();
}

export async function fetchLimitState(userId: string, key?: string): Promise<unknown> {
  const qs = new URLSearchParams({ userId });
  if (key) qs.set('key', key);
  const res = await adminFetch(`/admin/settings/limits/state?${qs}`);
  return res.json();
}

export async function fetchUsageLog(params: Record<string, string>): Promise<unknown> {
  const qs = new URLSearchParams(params);
  const res = await adminFetch(`/admin/settings/limits/usage-log?${qs}`);
  return res.json();
}

export const CATEGORY_LABELS: Record<string, string> = {
  'system-var': 'Системные',
  'tarif-var': 'Тарифные',
  'limited-user-var': 'Лимитные',
  'user-var': 'Пользовательские',
};

export const SERVICE_LABELS: Record<string, string> = {
  forum: 'Форум',
  auction: 'Аукцион',
  club: 'Клуб',
  chat: 'Чаты',
  user: 'Пользователь',
};
