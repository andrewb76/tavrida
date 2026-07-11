import { requireBearerToken } from './apiAuth';

export type PlanSummary = {
  id: string;
  title: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  isActive: boolean;
};

export type UserSubscription = {
  userId: string;
  planId: string;
  status: string;
  autoRenew: boolean;
  startsAt: string | null;
  expiresAt: string | null;
};

const MOCK_PLANS: PlanSummary[] = [
  {
    id: 'free',
    title: 'Бесплатно',
    description: 'Базовый доступ к клубу',
    monthlyPrice: 0,
    yearlyPrice: 0,
    isActive: true,
  },
  {
    id: 'basic',
    title: 'Базовый',
    description: 'Расширенные лимиты',
    monthlyPrice: 99,
    yearlyPrice: 990,
    isActive: true,
  },
  {
    id: 'pro',
    title: 'Про',
    description: 'Максимум возможностей',
    monthlyPrice: 399,
    yearlyPrice: 3990,
    isActive: true,
  },
];

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

export async function listPlans(): Promise<PlanSummary[]> {
  if (import.meta.env.VITE_USE_MOCK !== 'false') {
    await new Promise((r) => setTimeout(r, 80));
    return MOCK_PLANS;
  }

  const res = await fetch(`${apiBase()}/plans`, { headers: await authHeaders() });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(parseErrorBody(body, `Plans failed (${res.status})`));
  }
  return res.json() as Promise<PlanSummary[]>;
}

export async function getSubscription(): Promise<UserSubscription> {
  if (import.meta.env.VITE_USE_MOCK !== 'false') {
    return {
      userId: 'mock',
      planId: 'free',
      status: 'ACTIVE',
      autoRenew: false,
      startsAt: null,
      expiresAt: null,
    };
  }

  const res = await fetch(`${apiBase()}/plans/subscription`, { headers: await authHeaders() });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(parseErrorBody(body, `Subscription failed (${res.status})`));
  }
  return res.json() as Promise<UserSubscription>;
}

export async function activatePlan(input: {
  planId: string;
  autoRenew?: boolean;
  billingPeriod?: 'monthly' | 'yearly';
}): Promise<UserSubscription & { billingCharged?: boolean }> {
  if (import.meta.env.VITE_USE_MOCK !== 'false') {
    await new Promise((r) => setTimeout(r, 150));
    return {
      userId: 'mock',
      planId: input.planId,
      status: 'ACTIVE',
      autoRenew: input.autoRenew ?? true,
      startsAt: new Date().toISOString(),
      expiresAt:
        input.planId === 'free'
          ? null
          : new Date(Date.now() + 30 * 864e5).toISOString(),
      billingCharged: input.planId !== 'free',
    };
  }

  const res = await fetch(`${apiBase()}/plans/activate`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(parseErrorBody(body, `Activate failed (${res.status})`));
  }
  return res.json() as Promise<UserSubscription & { billingCharged?: boolean }>;
}

export async function cancelAutoRenew(): Promise<{ autoRenew: boolean; updated: boolean }> {
  if (import.meta.env.VITE_USE_MOCK !== 'false') {
    return { autoRenew: false, updated: true };
  }

  const res = await fetch(`${apiBase()}/plans/cancel-auto-renew`, {
    method: 'POST',
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(parseErrorBody(body, `Cancel auto-renew failed (${res.status})`));
  }
  return res.json() as Promise<{ autoRenew: boolean; updated: boolean }>;
}

export function formatPlanPrice(plan: PlanSummary, period: 'monthly' | 'yearly'): string {
  const price = period === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
  if (price === 0) return '0 ₽';
  const suffix = period === 'yearly' ? '/ год' : '/ мес';
  return `${price.toLocaleString('ru-RU')} ₽${suffix}`;
}
